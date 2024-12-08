import { Marked, RendererObject, TokenizerAndRendererExtension, Tokens } from "marked";
import { load as loadYAML } from "js-yaml";
import { countNewlines, LayoutFragment, measureJSExpression, ParseFailure, parseImports } from "./parseLayout.js";

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
    const marker = `D${jsxInDocNextKey++}`;
    jsxBuffer.push({ marker, code });
    return { type: "jsxBlock", raw: src.slice(0, end), marker };
  },
  renderer(token) {
    return `<div data-sitekit-embed="${token.marker}" style="display:none"></div>`;
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
    const marker = `D${jsxInDocNextKey++}`;
    jsxBuffer.push({ marker, code });
    return { type: "jsxBlock", raw: src.slice(0, end), marker };
  },
  renderer(token) {
    return `<span data-sitekit-embed="${token.marker}" style="display:none"></span>`;
  }
};

export interface HeadingEntry {
  depth: number;
  label: string;
  hash: string;
}

let headingsBuffer: HeadingEntry[] = [];

const customHeadingNameRenderer: RendererObject = {
  heading({ depth, text }): string {
    const reName = /(?:\s|^)\{#(?<name>[a-zA-Z0-9-]+)\s*\}\s*$/i;
    const reNamePart = /(?<=\s|^)\{#[a-zA-Z0-9-]+\s*\}(?:\s*)$/i;
    const m = text.match(reName);
    const [actual, name] =
      m ?
        [text.replace(reNamePart, ""), m.groups!.name] :
        [text, text.trim().replace(/[\s\.#]+/g, "-").toLowerCase()]; // TODO escaping must be reconsidered.
    headingsBuffer.push({ depth, hash: `#${name}`, label: actual });
    const permlinkElem = `<a class="header-anchor" href="#${name}" aria-label="Permalink to &quot;${actual}&quot;"></a>`;
    return `<h${depth} id="${name}">${actual}${permlinkElem}</h${depth}>\n`;
  },
}

const reFrontmatterHead = /[\r\n]*---[\r\n]+/my;
const reSearchFrontmatterEnd = /^---\s*$/m;

let lastFrontmatter: unknown;
let lastImports: LayoutFragment[];
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
  const fmEnd = fmYamlEnd + m[0].length;  // the end of the delimiter "---"".

  // extract and parse frontmatter
  const srcFm = src.slice(begin, fmYamlEnd);
  const frontmatter = loadYAML(srcFm);

  // measure and parse imports
  const srcAfterFm = src.slice(fmEnd);
  const { newlines: newlinesOffsetAfterFm } = countNewlines(src, 0, fmEnd);
  const pr = parseImports(srcAfterFm, newlinesOffsetAfterFm);

  // extract the remaining: markdown with JSX
  const markdown = srcAfterFm.slice(pr.pos);

  lastFrontmatter = frontmatter;
  lastImports = pr.parsed;
  lastImportsFailures = pr.failures;
  return markdown;
}

export type DocParseResult = {
  frontmatter: unknown;
  renderedMarkdown: string;
  importData: LayoutFragment[];
  headings: HeadingEntry[];
  jsxs: JSXInDocEntry[];
  failures: ParseFailure[];
};

export function parseDoc(src: string): DocParseResult {
  const marked = new Marked();

  marked.use({
    gfm: true,
    extensions: [jsxBlockExtension, jsxInlineExtension],
    hooks: { preprocess },
    renderer: customHeadingNameRenderer,
  });

  jsxBuffer = [];
  jsxInDocNextKey = 0;
  headingsBuffer = [];
  const renderedMarkdown = marked.parse(src) as string;
  const jsxs = jsxBuffer; // updated by marked extensions through marked.parse().
  const frontmatter = lastFrontmatter;
  const importData = lastImports;
  const headings = headingsBuffer;
  const failures = lastImportsFailures;

  // Just to be sure: prevent to be refered unexpectedly.
  jsxBuffer = [];
  jsxInDocNextKey = 0;
  headingsBuffer = [];
  lastFrontmatter = undefined;
  lastImports = [];
  lastImportsFailures = [];

  return { frontmatter, renderedMarkdown, jsxs, importData, headings, failures };
}
