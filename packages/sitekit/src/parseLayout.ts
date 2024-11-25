import { Parser as acornParser } from "acorn";
import acornJsx from "acorn-jsx";

const jsParser = acornParser.extend(acornJsx());

export type LayoutFragment =
  { type: "passthrough", code: string } |
  { type: "placeholder", value: "title" | "body" } |
  { type: "href", value: string, quote: "'" | "\"" } |
  { type: "jsenter" | "jsleave" } |
  { type: "importenter" | "importleave" } |
  { type: "closehtml" };

export interface ParseFailure {
  type: "warn" | "error";
  pos: number;
  line: number; // one-origin
  col: number; // one-origin
  msg: string;
}

interface LayoutParseContext {
  /**
   * the input string.
   */
  src: string;

  /**
   * the position of the end of the input. (i.e. `src.length`)
   */
  end: number;

  pos: number;

  segmentHead: number;

  jsxDepth: number;

  /**
   * The position of the first column of the current line.
   * (i.e. just after the last \r, \n, or \r\n as of `src[pos]`.)
   */
  lineHead: number;

  /**
   * The count of newlines (\r, \n, or \r\n) we found.
   * (i.e. zero-origin line number.)
   */
  newlines: number;

  parsed: LayoutFragment[];

  failures: ParseFailure[];
}

export function countNewlines(s: string, begin: number, end: number): { lineHead: number, newlines: number } {
  let newlines = 0;
  let lineHead = 0;
  for (let i = begin; i < end; ++i) {
    const c = s[i];
    if (c === "\n") {
      ++newlines;
      lineHead = i + 1;
    } else if (c === "\r") {
      ++newlines;
      if (s[i + 1] === "\n") {
        lineHead = i + 2;
        ++i;
      } else {
        lineHead = i + 1;
      }
    }
  }
  return { newlines, lineHead };
}

function runRe(ctx: LayoutParseContext, re: RegExp): RegExpExecArray | null {
  const { src, pos } = ctx;

  re.lastIndex = pos;
  const m = re.exec(src);
  // console.log(`RUNRE-${m ? "SUCC" : "FAIL"}`, JSON.stringify(src.slice(pos, pos + 16)), re); // debug
  if (!m) return m;
  const last = re.sticky ? re.lastIndex : m.index + m[0].length;

  const { newlines, lineHead } = countNewlines(src, pos, last);
  ctx.pos = last;
  ctx.newlines += newlines;
  ctx.lineHead = lineHead;

  return m;
}

function testRe(re: RegExp, src: string, pos: number): boolean {
  re.lastIndex = pos;
  return re.test(src);
}

function createLayoutParseContext(src: string): LayoutParseContext {
  return { src, end: src.length, pos: 0, segmentHead: 0, jsxDepth: 0, lineHead: 0, newlines: 0, parsed: [], failures: [] };
}

function addParseFailure(ctx: LayoutParseContext, type: ParseFailure["type"], msg: string): void {
  const { newlines: lineCount, lineHead, pos, failures } = ctx;
  const line = lineCount + 1;
  const col = pos - lineHead + 1;
  failures.push({ type, pos, line, col, msg });
}

const fatalParseErrorMarker: unique symbol = Symbol("fatal-parse-error-marker");

interface FatalParseError extends Error {
  marker: typeof fatalParseErrorMarker;
}

function isFatalParseError(e: any): e is FatalParseError {
  return (e as any)?.marker === fatalParseErrorMarker;
}

function assertParse(cond: unknown, ctx: LayoutParseContext, msg: string, recoverRe?: RegExp): asserts cond is true {
  if (cond) return;

  addParseFailure(ctx, "error", msg);

  if (recoverRe) {
    runRe(ctx, recoverRe);
    return;
  }

  const e = new Error("Parse Error") as FatalParseError;
  e.marker = fatalParseErrorMarker;
  throw e;
}

const reAttrHead = /[ \t\r\n\f]*(?<name>[^ \t\r\n\f"'>/=\0\x00-\x1f\x7f\x80-\x9f]+)(?:[ \t\r\n\f]*(?<eq>=)[ \t\r\n\f]*(?<head>["'{]?))?/iy;
//                              <-attr name--------------------------------------->                     =             <-check '"-->
const reAttrTailUnquoted = /[^<>= \t\r\n\f'"`]+/y;
const reAttrTailSQuoted = /(?<val>[^<>= \t\r\n\f'`]+)'/y;
const reAttrTailDQuoted = /(?<val>[^<>= \t\r\n\f"`]+)"/y;
const reAttrJSXClose = /[ \t\r\n\f]*}/y;
const reSkipToTagEnd = /[^>]*/y;

const resourceAttrTable = {
  href: new Set(["link"]),
  imagesrcset: new Set(["link"]),
  src: new Set(["img", "embed", "track", "audio", "video", "input", "script"]),
  srcset: new Set(["img", "source"]),
  data: new Set(["object"]),
  poster: new Set(["video"]),
} as const;

function consumeAttribute(ctx: LayoutParseContext, tagname?: string | undefined): boolean {
  const { jsxDepth } = ctx;
  const inJSX = jsxDepth > 0;

  const m = runRe(ctx, reAttrHead);
  if (!m) return false;

  const { name, eq, head } = m.groups!;
  if (!eq)
    return true;

  const p = ctx.pos;

  let val: string | undefined;
  switch (head) {
    case "\"": {
      val = runRe(ctx, reAttrTailDQuoted)?.groups!.val;
      break;
    }
    case "'": {
      val = runRe(ctx, reAttrTailSQuoted)?.groups!.val;
      break;
    }
    case "{": {
      if (!inJSX)
        addParseFailure(ctx, "error", `JSX value attribute outside JSX: ${name}={`);
      consumeJSValue(ctx);
      assertParse(runRe(ctx, reAttrJSXClose), ctx, "JSX value attribute not closed (by '}')", reSkipToTagEnd);
      break;
    }
    case "": {
      runRe(ctx, reAttrTailUnquoted);
      break;
    }
    default: {
      assertParse(false, ctx, `invalid attribute value, found: ${JSON.stringify(head)}`, reSkipToTagEnd);
    }
  }

  if (val && tagname && resourceAttrTable[name as keyof typeof resourceAttrTable]?.has(tagname)) {
    const { src, segmentHead, parsed } = ctx;
    parsed.push(
      { type: "passthrough", code: src.slice(segmentHead, p) }, // never empty since there is an attribute name
      { type: "href", value: val, quote: head as ("\"" | "'")}
    );
    ctx.segmentHead = ctx.pos - 1; // -1 to include ', "
  }

  return true;
}

function consumeJSValue(ctx: LayoutParseContext): boolean {
  const { src, pos } = ctx;

  try {
    const ast = jsParser.parseExpressionAt(src, pos, { ecmaVersion: "latest" });
    ctx.pos = ast.end;
  } catch (e) {
    if (!(e instanceof SyntaxError))
      throw e;
    const { line, column } = (e as any).loc as { line: number, column: number };
    addParseFailure(ctx, "error", `at (${line}, ${column}): ${e.message}`);
    runRe(ctx, /[^}]*/y); // skip to nearest } to recover
  }
  return true;
}

const reNonTagStart = /[^<{]+/my;
const rePlaceholder = /{(?:%sitekit:(?<type>title|body)%})?/my;
const reComment = /<!--(?:[^-]|-(?!->))*-->/my; // Intentionally loosen the spec to conform the actual browsers...
const reDoctype = /<!DOCTYPE[ \t\r\n\f]+[^>]*[ \t\r\n\f]*>/imy;
const reStartTagHead = /[ \t\r\n\f]*<(?<tagname>[\da-z]+)(?=[\s/>])/iy;
const reStartTagTail = /[ \t\r\n\f]*(?<closing>\/)?>/iy;
const reEndTag = /[^<]*<\/(?<tagname>[\da-z]+)[ \t\r\n\f]*>/iy;
const reVoidElementNames = /^(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/i;
const reRawOrRCDataElementNames = /^script|style|textarea|input$/i;
const reRawTextEndSearch = /(?:<\/(?<tagname>[\da-z]+)[ \t\r\n\f]*>){1}?/mi; // {1}? means lazy (match the nearest). No y flag to search the end.
const reLower = /[a-z]/y;
const reHtml = /^html$/i;

function consumeElement(ctx: LayoutParseContext): boolean {
  const { src, end, parsed, jsxDepth } = ctx;
  const inJSX = jsxDepth > 0;

  // skip a text, a comment, a DOCTYPE, or a placeholder
  while (ctx.pos < end) {
    if (runRe(ctx, reNonTagStart) || (!inJSX && (runRe(ctx, reComment) || runRe(ctx, reDoctype))))
      continue;

    const p0 = ctx.pos;
    const m = runRe(ctx, rePlaceholder);
    if (!m)
      break;

    if (m.groups?.type) {
      if (ctx.segmentHead < p0)
        parsed.push({ type: "passthrough", code: src.slice(ctx.segmentHead, p0) });
      parsed.push({ type: "placeholder", value: m.groups.type as "title" | "body" });
      ctx.segmentHead = ctx.pos;
    }
  }

  while (ctx.pos < end && (runRe(ctx, reNonTagStart) || (!inJSX && (runRe(ctx, reComment) || runRe(ctx, reDoctype)))))
    continue;

  let m: RegExpExecArray | null;
  const p = ctx.pos;

  // find element or jsx
  m = runRe(ctx, reStartTagHead);
  if (!m) return false;

  assertParse(m, ctx, "Failed to parse start tag.");

  const { tagname } = m.groups!;
  if (testRe(reLower, tagname, 0)) {
    // found an element (e.g "<div", "<img")
    while (consumeAttribute(ctx, tagname));

    m = runRe(ctx, reStartTagTail);
    assertParse(m, ctx, `The start tag <${tagname} is not closed.`);
    const selfClosing = m.groups?.closing === "/";

    if (selfClosing || reVoidElementNames.test(tagname)) {
      // void elements (e.g. img, br, hr, ...) have no end tag even if the start tag isn't self-closing (e.g. <img>).
      // do nothing.

    } else if (reRawOrRCDataElementNames.test(tagname)) {
      // raw text elements ro RCDATA elements
      m = runRe(ctx, reRawTextEndSearch);
      assertParse(m, ctx, `No close tag for <${tagname}> found.`);
      // TODO detect url() in style tag

    } else {
      // normal elements.
      while (consumeElement(ctx));

      if (reHtml.test(tagname)) {
        if (ctx.segmentHead < ctx.pos) {
          parsed.push({ type: "passthrough", code: src.slice(ctx.segmentHead, ctx.pos) });
          ctx.segmentHead = ctx.pos;
        }
        parsed.push({ type: "closehtml" });
      }

      m = runRe(ctx, reEndTag);
      assertParse(m, ctx, `No close tag for <${tagname}> found.`);
      assertParse(m.groups?.tagname === tagname, ctx, `No close tag for <${tagname}> but </${m.groups?.tagname}> found.`);
    }
  } else {
    // found a jsx (e.g. "<Componet")
    const depth = ctx.jsxDepth++;
    try {
      if (depth === 0) {
        const { segmentHead } = ctx;
        if (segmentHead < p) {
          parsed.push({ type: "passthrough", code: src.slice(segmentHead, p) });
          ctx.segmentHead = p;
        }
        parsed.push({ type: "jsenter" });
      }

      while (consumeAttribute(ctx));

      m = runRe(ctx, reStartTagTail);
      assertParse(m, ctx, `The start tag <${tagname} is not closed.`);
      const selfClosing = m.groups?.closing === "/";

      if (!selfClosing) {
        while (consumeElement(ctx));
        m = runRe(ctx, reEndTag);
        assertParse(m, ctx, `No close tag for <${tagname}> found.`);
        assertParse(m.groups?.tagname === tagname, ctx, `No close tag for <${tagname}> but </${m.groups?.tagname}> found.`);
      }
    } finally {
      ctx.jsxDepth--;
      if (depth === 0) {
        parsed.push(
          { type: "passthrough", code: src.slice(ctx.segmentHead, ctx.pos) }, // never empty since there is a component head.
          { type: "jsleave" }
        );
        ctx.segmentHead = ctx.pos;
      }
    }
  }
  return true;
}

const reEmptyLines = /[\r\n]*/my;
const reImportHead = /import\s+(?:\*\s+as\s+\w+\s+|\{[^\}]+\}\s*)?from\s+["']/my;
const reImportTail = /(?<target>[^"']+)(?<quote>["'])\s*;?[\t ]*[\r\n]*/my;
const reImportInvalid = /^[\t ]+import\s+(?:\*\s+as\s+\w+\s+|\{[^\}]+\}\s*)?from\s+["'][^"']+["']\s*;?\s*[\r\n]*/my;
const reSkipToImportEnd = /[^\r\n]*[\r\n]*/my;

function consumeImports(ctx: LayoutParseContext): void {
  const { src, end, parsed } = ctx;

  parsed.push({ type: "importenter" });

  runRe(ctx, reEmptyLines); // No rationale: empty lines are accepted as the first lines only.

  while (ctx.pos < end) {
    if (!runRe(ctx, reImportHead))
      break;

    const p0 = ctx.pos;
    const m = runRe(ctx, reImportTail);
    assertParse(m, ctx, "import statement broken.", reSkipToImportEnd);

    const { target, quote } = m.groups!;
    parsed.push(
      { type: "passthrough", code: src.slice(ctx.segmentHead, p0) }, // never empty: there is "import ~"
      { type: "href", quote: quote as "'" | "\"", value: target },
    );
    ctx.segmentHead = ctx.pos - m[0].length + target.length;  // set the pos of the closing quote ', ""
  }

  if (ctx.segmentHead < ctx.pos) {
    parsed.push({ type: "passthrough", code: src.slice(ctx.segmentHead, ctx.pos) });
    ctx.segmentHead = ctx.pos;
  }

  if (parsed[parsed.length - 1]?.type !== "importenter") {
    parsed.push({ type: "importleave" });
  } else {
    parsed.pop(); // drop jsenter because no imports found.
  }

  if (testRe(reImportInvalid, src, ctx.pos))
    addParseFailure(ctx, "warn", "preamble imports must start from the first column of a line." + src.slice(ctx.pos, 20));
}

export type LayoutParseResult =
  { success: true, failures: ParseFailure[], parsed: LayoutFragment[] } |
  { success: false, failures: ParseFailure[] };

export function parseLayout(s: string): LayoutParseResult {
  const ctx = createLayoutParseContext(s);
  const { src, end, parsed, failures } = ctx;

  try {
    consumeImports(ctx);
    // parse HTML
    ctx.segmentHead = ctx.pos;
    while (ctx.pos < end && consumeElement(ctx));
    if (ctx.segmentHead < end)
      parsed.push({ type: "passthrough", code: src.slice(ctx.segmentHead, end) });
  } catch (e) {
    if (!isFatalParseError(e)) throw e;
    return { success: false, failures };
  }
  return { success: true, parsed, failures };
}

export function measureJSExpression(src: string): number | null {
  try {
    const ast = jsParser.parseExpressionAt(src, 0, { "ecmaVersion": "latest" });
    return ast.end;
  } catch (_) {
    return null;
  }
}

export interface ParseImportsResult {
  parsed: LayoutFragment[];
  failures: ParseFailure[];
  pos: number;
}

export function parseImports(s: string, newlinesOffset: number = 0): ParseImportsResult {
  const ctx = createLayoutParseContext(s);
  ctx.newlines = newlinesOffset;
  consumeImports(ctx);
  return ctx;
}
