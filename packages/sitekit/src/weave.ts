import assert from "node:assert";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, parse as parsePath, relative, resolve } from "node:path";
import { ResolvedConfig } from "./config";
import { parseDoc } from "./parseDoc";
import { LayoutFragment, ParseFailure, parseLayout } from "./parseLayout";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export interface Layout {
  /**
   * the absolute path
   */
  dir: string;
  hash: string;
  refs: string[];
  fragments: LayoutFragment[];
}

export interface WeaveContext {
  resolvedConfig: ResolvedConfig;

  /**
   * The absolute path of the .sitekit/ dir.
   */
  configRoot: string;

  /**
   * The layout cache table.
   */
  layouts: Map<string, Layout>;

  staled: Set<string>;
}

export async function resolveLayout(ctx: WeaveContext, name: string): Promise<Layout | null> {
  const { configRoot, layouts, staled } = ctx;
  const themeRoot = join(configRoot, "theme");
  const layoutPath = join(themeRoot, `${name}.html`);
  assert(relative(themeRoot, layoutPath).startsWith(".."), `layout "${name}" is out of the theme directory.`);

  const layoutSrc = await readFile(layoutPath, "utf-8");
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
    refs: cache?.refs ?? [],
    fragments: parseResult.parsed
  };

  layouts.set(name, layout);
  cache?.refs.forEach(p => staled.add(p));
  return layout;
}

export async function weave(ctx: WeaveContext, path: string): Promise<void> {
  const { resolvedConfig, configRoot, layouts, staled } = ctx;
  const docPath = resolve(resolvedConfig.src, path);
  const docDir = dirname(docPath);
  const docRelPath = relative(resolvedConfig.src, docPath);
  assert(docRelPath.startsWith(".."), `"${path}" is out of the document directory.`);

  const { markdown, jsxs, importData, frontmatter, failures } = parseDoc(docPath);
  printFailure(failures, docPath);
  validateDocFrontmatter(frontmatter, docPath);

  const { layout: layoutName } = frontmatter;
  const layout = await resolveLayout(ctx, layoutName);
  if (!layout)
    return;

  const outPathBase = resolve(configRoot, ".workspace", stripExt(docRelPath));
  const outDir = dirname(outPathBase);
  const outPathHTML = outPathBase + ".html";
  const outPathJS = outPathBase + ".js";

  // weave .html
  const jsFrags: string[] = [];
  const htmlFrags: string[] = [];

  let inJS = false;
  const pushFrag = (code: string): void => {
    (inJS ? jsFrags : htmlFrags).push(code);
  };

  layout.fragments.forEach(frag => {
    switch (frag.type) {
      case "jsenter": {
        inJS = true;
        break;
      }

      case "jsleave": {
        inJS = false;
        break;
      }

      case "passthrough": {
        pushFrag(frag.code);
        break;
      }

      case "placeholder": {
        switch (frag.value) {
          case "body": {
            pushFrag(markdown);
            break;
          }
          case "title": {
            // TODO should detect the title-like string from headings in .md? or introdue the default title in layout?
            pushFrag(frontmatter.title ?? "");
            break;
          }
          case "params": {
            // unused yet
            break;
          }
        }
        break;
      }

      case "href": {
        const { quote, value } = frag;
        if (!(/^\.\.?\//.test(value))) {
          pushFrag(value);
          break;
        }
        const path = dotSlashRelative(outDir, resolve(layout.dir, value));
        const re = (quote === "'") ? /(?<!\\)(?=')/g : /(?<!\\)(?=")/g;
        const escaped = path.replaceAll(re, "\\");
        pushFrag(escaped);
        break;
      }

      default: {
        unreachable(frag);
      }
    }
  });
}

function unreachable(_: never): void {}

function dotSlashRelative(from: string, to: string): string {
  const p = relative(from, to).replaceAll("\\", "/");
  return (p[0] === ".") ? p : "./" + p;
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
    throw new Error("Giveup by parse failure");
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
  assert(title && typeof title === "string", `${path} has no 'title' fieald in its frontmatter.`);
}
