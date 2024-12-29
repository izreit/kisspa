import { arrayify, mapCoerce } from "../html/core/util";
import { createEmptyObj, objForEach, objKeys } from "./objutil";
import { parse } from "./parse";
import { type CSSGroupingRuleLike, createSheet } from "./sheet";

export namespace Tag {
  export type ColorStr = string;

  export type StyleSheetLike = CSSGroupingRuleLike;

  export interface ModifierDef {
    type_: "<whole>" | "<selector>";
    prefix_: string;
    postfix_: string;
  }

  export interface Config {
    prefix: string;

    /**
     * Define modifiers.
     *
     * The keys of the properties will be modifier names. The values are their expansion form.
     * A value must include either `"<whole>" or `"<selector>".
     * `"<whole>"` is replaced by the generated declaration.
     * `"<selector>"` is replaced by the selector of the generated declaration.
     *
     * For example, the following declares a modifier `print`:
     *
     * ```
     * $.extend({
     *   modifiers: {
     *     // modifier for style only applied for printers
     *     print: "@media printer { <whole> }",
     *   }
     * });
     * ```
     *
     * then you can use it (e.g. ``` $`print/background:white` ```).
     *
     * Another example:
     *
     * ```
     * $.extend({
     *   modifiers: {
     *     // override a screen size breakpoint.
     *     xl: "@media (min-width: 1700px) { <whole> }",
     *
     *     // dark mode modifier that uses preferes-color-scheme
     *     dark: "@media (prefers-color-scheme: dark) { <whole> }",
     *
     *     // dark mode modifier that uses className "dark".
     *     dark: "<selector>:is(.dark *)",
     *
     *     // dark mode modifier that uses a data attribute `data-darkmode`.
     *     dark: "<selector>:where([data-darkmode="true"], [data-darkmode="true"] *)",
     *   }
     * })
     * ```
     */
    modifiers: { [key: string]: ModifierDef | undefined };

    properties: { [key: string]: string[] | undefined };
    colors: { [colorName: string]: { [colorVal: string]: ColorStr | undefined } | undefined };
    colorRe: RegExp | null;
    num: (v: number) => string;
    aliases: { [key: string]: string | undefined };
  }

  export interface ExtendOptions {
    prefix?: string;
    modifiers?: { [key: string]: string };
    properties?: { [key: string]: string };
    colors?: { [colorName: string]: { [colorVal: string]: ColorStr } };
    num?: (v: number) => string;
    aliases?: { [key: string]: string };
    keyframes?: { [name: string]: string };
  }
}

export interface Tag {
  (strs: TemplateStringsArray, ...exprs: (string | (() => string))[]): () => string;
  extend(opts: Tag.ExtendOptions): void;
  add(rule: string): void;
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

const reNum = /^\d+(?:\.5)?$/;

function replaceValue(val: string[], config: Tag.Config): void {
  const { colors: color, colorRe, num } = config;
  for (let i = 0; i < val.length; ++i) {
    const v = val[i];
    let m: RegExpMatchArray | null | undefined;
    if (reNum.test(v)) {
      val[i] = num(Number(v));
    } else if (colorRe && (m = v.match(colorRe))) {
      const alpha = m[3] ? Math.ceil(255 * parseInt(m[3]) / 100).toString(16) : "";
      const colorTable = color[m[1]];
      val[i] = `${colorTable && colorTable[m[2]]}${alpha}`;
    }
  }
}

const reModifierPlaceHolder = /(<(?:selector|whole)>)/;
const modifierPlaceHolderWhole = "<whole>";

export function createTag(target?: Tag.StyleSheetLike): Tag {
  if (!target) {
    const el = document.createElement("style");
    document.head.appendChild(el);
    target = el.sheet!;
  }
  const sheet = createSheet(target);
  const addRule = (s: string) => sheet.addRule_(s);

  const config: Tag.Config = {
    prefix: "",
    modifiers: createEmptyObj(),
    properties: createEmptyObj(),
    aliases: createEmptyObj(),
    colors: createEmptyObj(),
    colorRe: null,
    num: n => `${n / 4}rem`,
  };

  const makeCSSDeclarations = (name: string[], value: string[]): string => {
    const { properties: propTable } = config;
    const propNames = product(...name.map(n => propTable[n] ?? n));
    replaceValue(value, config);
    return `${propNames.map(propName => `${propName.join("-")}: ${value.join(" ")}`).join(";")}`;
  }

  const cacheTable = new Map<string, string>();
  const registered = new Set<string>();

  function parseAndRegister(s: string, checkFirst?: boolean, checkLast?: boolean): string {
    const cache = cacheTable.get(s);
    if (cache) return cache;

    const parsed = parse(s);
    if (parsed.val_.length === 0)
      return "";

    if (checkFirst && !/^\s/.test(s))
      console.warn(`upwind: ${JSON.stringify(s)} should begin with " " to be treated as such.`);
    if (checkLast && !/\s$/.test(s))
      console.warn(`upwind: ${JSON.stringify(s)} should end with " " to be treated as such.`);

    const { prefix, modifiers: modifierTable, aliases: aliasTable } = config;
    const klasses = parsed.val_.map(decl => {
      const { mods: modifiers, name, value, begin, end } = decl;

      // no value (classname without ':') is treated as-is.
      if (!value) {
        const n = name.join("-");
        return aliasTable[n] ?? n;
      }

      const declSrc = s.slice(begin, end);
      const modPrefix = modifiers.map(m => s.slice(m.begin, m.end)).join(".");
      // escape " " to equivalent "_" because HTMLElement's `class` attribute uses " " as the delimiter.
      const className = (`${prefix}${modPrefix ? (modPrefix + ".") : ""}${declSrc}`).replace(/ /g, "_");
      if (registered.has(className))
        return className;

      // wrap selector by selector modifiers (e.g. :active, :hover_peer~)
      let selector = "." + CSS.escape(className);
      for (let i = 0; i < modifiers.length; ++i) {
        const { modKey, target } = modifiers[i];
        if (modKey[0] === ":") {
          selector = target ? `.${target.name}${modKey} ${target.rel ?? ""} ${selector}` : `${selector}${modKey}`;
        } else {
          const decl = modifierTable[modKey];
          if (decl && decl.type_ !== modifierPlaceHolderWhole)
            selector = `${decl.prefix_}${selector}${decl.postfix_}`;
        }
      }

      // wrap style by whole modifiers (e.g. sm, md)
      let style = `${selector}{${makeCSSDeclarations(name, value)}}`;
      for (let i = 0; i < modifiers.length; ++i) {
        const decl = modifierTable[modifiers[i].modKey];
        if (decl && decl.type_ === modifierPlaceHolderWhole)
          style = `${decl.prefix_}${style}${decl.postfix_}`;
      }

      addRule(style);
      registered.add(className);
      return className;
    });

    const ret = klasses.join(" ");
    cacheTable.set(s, ret);
    return ret;
  }

  function extend(opts: Tag.ExtendOptions): void {
    const { prefix, modifiers, properties, aliases, colors, keyframes, num } = opts;

    if (prefix != null)
      config.prefix = prefix;

    if (modifiers) {
      objForEach(modifiers, (v, k) => {
        const m  = v.match(reModifierPlaceHolder);
        if (m) {
          const type_ = m[0] as "<whole>" | "<selector>";
          const [prefix_, postfix_] = v.split(m[0]);
          config.modifiers[k] = { type_, prefix_, postfix_: postfix_ ?? "" };
        }
      });
    }

    if (properties) {
      objForEach(properties, (v, k) => {
        if (k.includes("<trbl>")) {
          for (const [abbrev, expanded] of trbl)
            config.properties[k.replace("<trbl>", abbrev)] = mapCoerce(expanded, e => v.replace("<trbl>", e));
        } else {
          config.properties[k] = [v];
        }
      });
    }

    if (colors) {
      copyProps(config.colors, colors);
      const colorNames = objKeys(config.colors)
        .map(name => name.replace(/[^a-zA-Z0-9]/g, "")); // sanitize for safety
      config.colorRe = new RegExp(`^(${colorNames.join("|")})-(\\d{1,3})(?:/(\\d{1,2}))?$`);
    }

    if (num)
      config.num = num;

    // Aliases and keyframes must be the last step since they may use other settings.
    if (aliases)
      objForEach(aliases, (v, k) => { config.aliases[k] = parseAndRegister(v); });

    if (keyframes) {
      const { aliases: aliasTable } = config;
      objForEach(keyframes, (v, k) => {
        const rules = parse(v).val_.map(decl => {
          const { mods, name, value } = decl;
          const timings = mods.map(m => m.modKey).join(","); // modifiers for keyframes are expected as the timing (e.g. from, to, 30%)
          const cssdecl = value ? makeCSSDeclarations(name, value) : (aliasTable[name.join("-")] ?? "");
          return `${timings}{${cssdecl}}`;
        }).join("");
        addRule(`@keyframes ${k} {${rules}}`);
      });
    }
  }

  const ret = ((strs: TemplateStringsArray, ...exprs: (string | (() => string))[]): () => string => {
    // assert(strs.length > 0 && strs.length === exprs.length + 1); // always true as long as used as a tagged template literal.
    const base: (string | number)[] = [];
    const funs: [number, () => string][] = [];
    let i = 0;
    for (; i < exprs.length; ++i) {
      const e = exprs[i]!;
      base.push(
        parseAndRegister(strs[i], i > 0, true),
        typeof e === "string" ?
          parseAndRegister(e) :
          funs.push([2 * i + 1, e]) // never referred: just used as placeholder
      );
    }
    base.push(parseAndRegister(strs[i], i > 0, false));

    return () => {
      for (const [i, e] of funs)
        base[i] = parseAndRegister(e());
      return base.join(" ");
    };
  }) as Tag;

  ret.extend = extend;
  ret.add = addRule;
  return ret;
}
