import { marked, TokenizerAndRendererExtension, Tokens } from "marked";
import { load as loadYAML } from "js-yaml";
import { countNewlines, LayoutEntry, measureJSExpression, ParseFailure, parseImports } from "./parseLayout";

const reSearchBlockJSXStartTagHead = /(?<=(?:\r|\n|\r\n){2,})<[A-Z][\da-zA-Z\.]*(?=[\s/>])/;
const reBlockJSXStartTagHead = /^<[A-Z][\da-zA-Z\.]*(?=[\s/>])/;
const reSearchInlineJSXStartTagHead = /(?<!(?:\r|\n|\r\n){2,})[A-Z][\da-zA-Z\.]*(?=[\s/>])/;
const reInlineJSXStartTagHead = /^<[A-Z][\da-zA-Z\.]*(?=[\s/>])/;

export interface JSXInDocEntry {
  marker: string;
  code: string;
}

let jsxBuffer: JSXInDocEntry[] = [];
let jsxInDocNextKey: number = 0;

const jsxBlockExtension: TokenizerAndRendererExtension = {
  name: "jsxBlock",
  level: "block",
  start(src) {
    return src.match(reSearchBlockJSXStartTagHead)?.index;
  },
  tokenizer(src, _tokens): Tokens.Generic | undefined {
    if (!reBlockJSXStartTagHead.test(src)) return;

    const end = measureJSExpression(src);
    if (end == null) return;
    const code = src.slice(0, end);
    const marker = `${jsxInDocNextKey++}`;
    jsxBuffer.push({ marker, code });
    return { type: "jsxBlock", raw: src.slice(0, end), marker };
  },
  renderer(token) {
    return `<div data-sitekit-embed="${token.marker}" style="display:none" />`;
  }
};

const jsxInlineExtension: TokenizerAndRendererExtension = {
  name: "jsxInline",
  level: "inline",
  start(src) {
    return src.match(reSearchInlineJSXStartTagHead)?.index;
  },
  tokenizer(src, _tokens): Tokens.Generic | undefined {
    if (!reInlineJSXStartTagHead.test(src)) return;

    const end = measureJSExpression(src);
    if (end == null) {
      // TODO warn that inline JSX must be written in a single line.
      return;
    }
    const code = src.slice(0, end);
    const marker = `${jsxInDocNextKey++}`;
    jsxBuffer.push({ marker, code });
    return { type: "jsxBlock", raw: src.slice(0, end), marker };
  },
  renderer(token) {
    return `<span data-sitekit-embed="${token.marker}" style="display:none" />`;
  }
};

const reFrontmatterHead = /[\r\n]*---[\r\n]+/my;
const reSearchFrontmatterEnd = /^---\s*$/m;

let lastFrontmatter: unknown;
let lastImports: LayoutEntry[];
let lastImportsFailures: ParseFailure[];

function preprocess(src: string): string {
  // measure frontmatter range
  reFrontmatterHead.lastIndex = 0;
  if (!reFrontmatterHead.exec(src))
    return src;
  const begin = reFrontmatterHead.lastIndex;
  const m = reSearchFrontmatterEnd.exec(src.slice(begin));
  if (!m)
    return src;

  const fmYamlEnd = begin + m.index;
  const fmEnd = fmYamlEnd + m[0].length;

  const srcFm = src.slice(begin, fmYamlEnd);
  const srcAfterFm = src.slice(fmEnd);
  const frontmatter = loadYAML(srcFm);

  const { newlines: newlinesOffsetAfterFm } = countNewlines(src, 0, fmEnd);
  const pr = parseImports(srcAfterFm, newlinesOffsetAfterFm);
  const markdown = srcAfterFm.slice(pr.pos);

  lastFrontmatter = frontmatter;
  lastImports = pr.parsed;
  lastImportsFailures = pr.failures;
  return markdown;
}

marked.use({
  extensions: [jsxBlockExtension, jsxInlineExtension],
  hooks: { preprocess },
});

export type DocParseResult = {
  frontmatter: unknown;
  markdown: string;
  importData: LayoutEntry[];
  jsxFrags: JSXInDocEntry[];
  failures: ParseFailure[];
};

export function parseDoc(src: string): DocParseResult {
  jsxBuffer = [];
  const markdown = marked.parse(src) as string;
  const jsxFrags = jsxBuffer; // updated by marked extensions through marked.parse().
  const frontmatter = lastFrontmatter;
  const importData = lastImports;
  const failures = lastImportsFailures;

  // Just to be sure: prevent to be refered unexpectedly.
  jsxBuffer = [];
  lastFrontmatter = undefined;
  lastImports = [];
  lastImportsFailures = [];

  return { frontmatter, markdown, jsxFrags, importData, failures };
}
