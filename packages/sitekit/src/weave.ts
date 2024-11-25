import assert from "node:assert";
import { createHash } from "node:crypto";
import { basename, dirname, join, parse as parsePath, relative, resolve } from "node:path";
import { loadConfig, ResolvedConfig } from "./config";
import { parseDoc } from "./parseDoc";
import { LayoutFragment, ParseFailure, parseLayout } from "./parseLayout";
import { defaultHandlers, SitekitHandlers } from "./handlers";

const THEME_DIR_NAME = "theme";
const WORKSPACE_DIR_NAME = ".workspace";

export interface Layout {
  /**
   * the absolute path
   */
  dir: string;
  hash: string;
  refs: Set<string>;
  fragments: LayoutFragment[];
}

export interface WeaveContext {
  /**
   * The absolute path of the .sitekit/ dir.
   */
  configRoot: string;

  /**
   * Config.
   */
  resolvedConfig: ResolvedConfig;

  /**
   * The layout cache table.
   */
  layouts: Map<string, Layout>;

  /**
   * The relative paths (from configRoot) of docs (.md) refering changed layouts.
   */
  staled: Set<string>;

  handlers: SitekitHandlers;
}

export async function createWeaveContext(handlers: SitekitHandlers | null, configRoot: string): Promise<WeaveContext> {
  const h = handlers || defaultHandlers;
  const absConfigRoot = resolve(configRoot);
  return {
    configRoot: absConfigRoot,
    resolvedConfig: await loadConfig(h, absConfigRoot),
    layouts: new Map(),
    staled: new Set(),
    handlers: h,
  };
}

export async function resolveLayout(ctx: WeaveContext, name: string): Promise<Layout | null> {
  const { configRoot, layouts, staled, handlers } = ctx;
  const themeRoot = join(configRoot, THEME_DIR_NAME);
  const layoutPath = join(themeRoot, `${name}.html`);
  assert(!relative(themeRoot, layoutPath).startsWith(".."), `layout "${name}" is out of the theme directory.`);

  const layoutSrc = await handlers.readTextFile(layoutPath);
  const hash = sha256(layoutSrc);
  const cache = layouts.get(name);
  if (cache?.hash === hash)
    return cache;

  const parseResult = parseLayout(layoutSrc);
  printFailure(parseResult.failures, layoutPath);
  if (!parseResult.success)
    return null;

  const layout: Layout = {
    dir: dirname(layoutPath),
    hash,
    refs: cache?.refs ?? new Set(),
    fragments: parseResult.parsed
  };

  layouts.set(name, layout);
  cache?.refs.forEach(p => staled.add(p));
  return layout;
}

export async function weave(ctx: WeaveContext, path: string): Promise<void> {
  const { resolvedConfig, configRoot, staled, handlers } = ctx;
  const docPath = resolve(resolvedConfig.src, path);
  const docDir = dirname(docPath);
  const docRelPath = relative(resolvedConfig.src, docPath);
  assert(!docRelPath.startsWith(".."), `"${path}" is out of the document directory. ${resolvedConfig.src} to ${docPath} is ${docRelPath}`);

  const docSrc = await handlers.readTextFile(docPath);
  const { markdown, jsxs, importData, frontmatter, failures } = parseDoc(docSrc);
  printFailure(failures, docPath);
  validateDocFrontmatter(frontmatter, docPath);

  const { layout: layoutName } = frontmatter;
  const layout = await resolveLayout(ctx, layoutName);
  if (!layout)
    return;

  const outPathBase = resolve(configRoot, WORKSPACE_DIR_NAME, stripExt(docRelPath));
  const outDir = dirname(outPathBase);
  const outBasename = basename(outPathBase);
  const outPathHTML = outPathBase + ".html";
  const outPathLayoutJS = outPathBase + ".layout.js";
  const outPathDocJS = outPathBase + ".doc.js";

  const layoutJsFrags: string[] = [];
  const docJsFrags: string[] = [];
  const htmlFrags: string[] = [];

  // weave .doc.js
  if (jsxs.length > 0)
    docJsFrags.push(`import { attach as __kisspa_attach__ } from "kisspa";\n`);
  importData.forEach(frag => {
    switch (frag.type) {
      case "passthrough": {
        docJsFrags.push(frag.code);
        break;
      }
      case "href": {
        const { quote, value } = frag;
        const path = isRelativePath(value) ? asDotSlashRelative(outDir, resolve(docDir, value), quote) : value;
        docJsFrags.push(path);
        break;
      }
      case "importenter": case "importleave": case "jsenter": case "jsleave": {
        // do nothing.
        break;
      }
      case "placeholder": case "closehtml": {
        throwError("unexpected fragment in import");
      }
      default: {
        unreachable(frag);
      }
    }
  });
  jsxs.forEach(({ marker, code }) => {
    docJsFrags.push(`__kisspa_attach__(document.querySelector([data-sitekit-embed="${marker}"]), ${code});\n`);
  });

  let mode: "html" | "js" | "import" = "html";
  let jsxCurrentKey = 0;
  let foundJSX = false;

  const pushFrag = (code: string, marker: string = `L${jsxCurrentKey}`): void => {
    switch (mode) {
      case "html": {
        htmlFrags.push(code);
        break;
      }
      case "import": {
        layoutJsFrags.push(code);
        break;
      }
      case "js": {
        if (!foundJSX) {
          // TODO name literals, support other JSX libraries.
          // Ugh! how to avoid name conflit?
          layoutJsFrags.unshift(`import { attach as __kisspa_attach__ } from "kisspa";\n`);
          foundJSX = true;
        }
        layoutJsFrags.push(`__kisspa_attach__(document.querySelector([data-sitekit-embed="${marker}"]), ${code});\n`);
        break;
      }
      default: {
        unreachable(mode);
      }
    }
  };

  // weave .html
  layout.fragments.forEach(frag => {
    switch (frag.type) {
      case "jsenter": {
        mode = "js";
        break;
      }
      case "jsleave": {
        mode = "html";
        htmlFrags.push(`<div data-sitekit-embed="L${jsxCurrentKey}" style="display:none" />"`);
        jsxCurrentKey++;
        break;
      }
      case "importenter": {
        mode = "import";
        break;
      }
      case "importleave": {
        mode = "html";
        break;
      }
      case "passthrough": {
        pushFrag(frag.code);
        break;
      }
      case "placeholder": {
        const { value } = frag;
        if (value === "body") {
          pushFrag(markdown);
        } else if (value === "title") {
          // TODO should detect the title-like string from headings in .md? or introdue the default title in layout?
          pushFrag(frontmatter.title ?? "");
        } else {
          unreachable(value);
        }
        break;
      }
      case "href": {
        const { quote, value } = frag;
        const path = isRelativePath(value) ? asDotSlashRelative(outDir, resolve(layout.dir, value), quote) : value;
        pushFrag(path);
        break;
      }
      case "closehtml": {
        htmlFrags.push(
          `<script type="module" src="./${outBasename}.layout.js" />\n`,
          `<script type="module" src="./${outBasename}.doc.js" />\n`,
        );
        break;
      }
      default: {
        unreachable(frag);
      }
    }
  });

  await handlers.writeTextFile(outPathHTML, htmlFrags.join(""));
  await handlers.writeTextFile(outPathLayoutJS, layoutJsFrags.join(""));
  await handlers.writeTextFile(outPathDocJS, docJsFrags.join(""));

  layout.refs.add(path);
  staled.delete(path);
}

function throwError(msg: string): never {
  throw new Error(msg);
}

function unreachable(_: never): void {}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

const reIsRelativePath = /^\.\.?\//;
const reUnescapedSQuote = /(?<!\\)(?=')/g;
const reUnescapedDQuote = /(?<!\\)(?=")/g;

function isRelativePath(p: string): boolean {
  return reIsRelativePath.test(p);
}

function asDotSlashRelative(from: string, to: string, escapeQuoteType: "'" | "\""): string {
  const raw = relative(from, to).replaceAll("\\", "/");
  const path = (raw[0] === ".") ? raw : "./" + raw;
  const reUnescaped = escapeQuoteType === "'" ? reUnescapedSQuote : reUnescapedDQuote;
  return path.replaceAll(reUnescaped, "\\");
}

function stripExt(path: string): string {
  const { dir, name } = parsePath(path);
  return join(dir, name);
}

function printFailure(failures: ParseFailure[], srcPath: string): void {
  failures.forEach(({ type, col, line, msg }) => {
    const message = `${srcPath}(${line}, ${col}) ${msg}`;
    (type === "error") ? console.error(message) : console.warn(message);
  });

  if (failures.find(f => f.type === "error"))
    throwError("Giveup by parse failure");
}

interface DocFrontmatter {
  layout: string;
  title: string | undefined | null;
  [key: string]: unknown;
}

function validateDocFrontmatter(fm: unknown, path: string): asserts fm is DocFrontmatter {
  assert(fm, `${path} has no valid frontmatter.`);

  const { layout, title } = fm as any;
  assert(typeof layout === "string", `${path} has no 'layout' fieald in its frontmatter.`);
  assert(!title || typeof title === "string", `${path} has no 'title' fieald in its frontmatter.`);
}
