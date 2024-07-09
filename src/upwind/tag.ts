import { mapCoerce, arrayify } from "../html/core/util";
import { createEmptyObj, objForEach } from "./objutil";
import { parse } from "./parse";

export namespace Tag {
  export type ColorStr = string;

  export interface Config {
    root: string | null;
    prefix: string;
    media: { [key: string]: string };
    alias: { [key: string]: string[] };
    color: { [colorName: string]: { [colorVal: string]: ColorStr } };
    colorRe: RegExp | null;
  }

  export interface ExtendOptions {
    root?: string;
    prefix?: string;
    media?: { [key: string]: string };
    alias?: { [key: string]: string };
    color?: { [colorName: string]: { [colorVal: string]: ColorStr } };
  }
}

export interface Tag {
  (strs: TemplateStringsArray, ...exprs: (string | (() => string))[]): () => string;
  extend(opts: Tag.ExtendOptions): void;
}

const trbl: [string, string | string[]][] = [
  ["", ""],
  ["t", "-top"],
  ["r", "-right"],
  ["b", "-bottom"],
  ["l", "-left"],
  ["x", ["-left", "-right"]],
  ["y", ["-top", "-bottom"]],
  ["s", "-inline-start"],
  ["e", "-inline-end"],
];

function extend(config: Tag.Config, opts: Tag.ExtendOptions): void {
  const { root, prefix, media, alias, color } = opts;

  if (root)
    config.root = root;
  if (prefix != null)
    config.prefix = prefix;
  if (media)
    copyProps(config.media, media);

  if (alias) {
    copyProps(config.alias, Object.keys(alias).reduce((acc, k) => {
      const v = alias[k];
      if (k.includes("<trbl>")) {
        trbl.forEach(([abbrev, expanded]) => {
          acc[k.replace("<trbl>", abbrev)] = mapCoerce(expanded, e => v.replace("<trbl>", e));
        });
      } else {
        acc[k] = [v];
      }
      return acc;
    }, {} as { [key: string]: string[] }));
  }

  if (color) {
    copyProps(config.color, color);
    const colorNames = Object.keys(config.color)
      .map(name => name.replace(/[^a-zA-Z0-9]/g, "")); // sanitize for safety
    config.colorRe = new RegExp(`^(${colorNames.join("|")})-(\\d{1,3})(?:/(\\d{1,2}))$`);
  }
}

function escape(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, c => "\\" + c);
}

function copyProps<T extends object>(lhs: T, rhs: T): void {
  objForEach(rhs, (v, k) => { lhs[k] = v; });
}

function product(...args: (string | string[])[]): string[][] {
  if (args.length === 0) return [];
  let ret = arrayify(args[0]).map(v => [v]);
  for (let i = 1; i < args.length; ++i)
    ret = ret.flatMap(x => mapCoerce(args[i], y => x.concat(y)));
  return ret;
}

function replaceColor(val: string[], config: Tag.Config): void {
  const { color, colorRe } = config;
  if (!colorRe) return;
  for (let i = 0; i < val.length; ++i) {
    const m = val[i].match(colorRe);
    if (!m) continue;
    const alpha = Math.ceil(255 * parseInt(m[3]) / 100).toString(16);
    val[i] = `${color[m[1]][m[2]]}${alpha}`;
  }
}

export function createTag(): Tag {
  // Note that `new CSSStyeSheet()` is't suported by Safari as of 16.4 (2023-03-27).
  const el = document.createElement("style");
  document.head.appendChild(el);
  const sheet = el.sheet!;

  const config: Tag.Config = {
    root: null,
    prefix: "",
    media: createEmptyObj(),
    alias: createEmptyObj(),
    color: createEmptyObj(),
    colorRe: null,
  };

  const cacheTable = new Map<string, string>();
  const registered = new Set<string>();

  function parseAndRegister(s: string, checkFirst: boolean, checkLast: boolean): string {
    const cache = cacheTable.get(s);
    if (cache) return cache;

    const parsed = parse(s);
    if (parsed.val.length === 0)
      return "";

    if (checkFirst && !/^\s/.test(s))
      console.warn(`upwind: ${JSON.stringify(s)} should begin with " " since treated as if there.`);
    if (checkLast && !/\s$/.test(s))
      console.warn(`upwind: ${JSON.stringify(s)} should end with " " since treated as if there.`);

    const { root, prefix, media, alias } = config;
    const klasses = parsed.val.map(decl => {
      const { modifiers, name, value, begin, end } = decl;

      // no value (classname without ':') is treated as-is.
      if (value == null)
        return name.join("-");

      const declSrc = s.slice(begin, end);
      const modPrefix = modifiers.map(m => s.slice(m.begin, m.end)).join(".");
      const className = `${prefix}${modPrefix ? (modPrefix + ".") : ""}${declSrc}`;
      if (registered.has(className))
        return className;

      // wrap selector by modifiers (e.g. :active, :hover_peer~)
      let modStack: typeof modifiers = [];
      let selector = "." + escape(className);
      for (let i = 0; i < modifiers.length; ++i) {
        const { modKey, target } = modifiers[i];
        if (modKey[0] === ":") {
          selector = target ? `${target.name}${modKey} ${target.rel ?? ""} ${selector}` : `${selector}${modKey}`;
        } else {
          modStack.push(modifiers[i]);
        }
      }
      if (root)
        selector = `${root} ${selector}`;

      // expand alias
      const propNames = product(...name.map(n => alias[n] ?? n));

      replaceColor(value, config);
      const valueStr = value.join(" ");

      // wrap style by media modifiers (e.g. sm, md)
      let style = `${selector} { ${propNames.map(propName => `${propName.join("-")}: ${valueStr}`).join(";")} }`;
      for (let i = modStack.length - 1; i >= 0; --i) {
        const med = media[modStack[i].modKey];
        if (!med) continue;
        style = `@media ${med} { ${style} }`;
      }

      sheet.insertRule(style);
      registered.add(className);
      return className;
    });

    const ret = klasses.join(" ");
    cacheTable.set(s, ret);
    return ret;
  }

  const ret = ((strs: TemplateStringsArray, ...exprs: (string | (() => string))[]): () => string => {
    if (strs.length === 0) return () => "";

    const parsed: (string | (() => string))[] = [];
    for (let i = 0; i < strs.length - 1; ++i) {
      parsed.push(parseAndRegister(strs[i], i > 0, true));
      const e = exprs[i]!;
      parsed.push((typeof e === "string") ? parseAndRegister(e, false, false) : e);
    }
    parsed.push(parseAndRegister(strs[strs.length - 1], strs.length > 1, false));

    return () => {
      let ret = "";
      for (let i = 0; i < parsed.length; ++i) {
        const p = parsed[i];
        ret += " " + ((typeof p === "string") ? p : p());
      };
      return ret;
    };
  }) as Tag;

  ret.extend = opts => extend(config, opts);
  return ret;
}
