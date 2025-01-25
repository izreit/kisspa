import type { JSXInternal } from "../html/core/jsx.js";
import { isFunction, isString, mapCoerce } from "../html/core/util.js";
import { createEmptyObj, objForEach, objKeys } from "./objutil.js";
import { type Mod, parse, parseMod, parseValRaw } from "./parse.js";
import { type CSSGroupingRuleLike, type Sheet, createRootSheet } from "./sheet.js";

export namespace Upwind {
  type DOMCSSProperties = JSXInternal.DOMCSSProperties;
	export type ExtendedDOMCSSProperties = {
		[key in keyof DOMCSSProperties]?: DOMCSSProperties[key];
  } | {
		[key in string]?: key extends "$when" ? (() => boolean) : ExtendedDOMCSSProperties;
  };

  export type ColorStr = string;

  export type StyleSheetLike = CSSGroupingRuleLike;

  export interface Config {
    prefix: string;

    conditionNames: Set<string>;
    selectorModifiers: { [key: string]: [string, string] | undefined };

    properties: { [key: string]: string[] | undefined };
    colors: { [colorName: string]: { [colorVal: string]: ColorStr | undefined } | undefined };
    colorRe: RegExp | null;
    num: (v: number) => string;
    aliases: { [key: string]: string | undefined };
  }

  export interface ExtendOptions {
    prefix?: string;

    modifiers?: {
      /**
       * Define modifiers for CSSConditionRule (e.g. @media).
       *
       * The keys of the object will be modifier names. The values are their @-rule definition.
       * For example, the following declares a modifier `print`:
       *
       * ```
       * $.extend({
       *   conditions: {
       *     // modifier for style only applied for printers
       *     print: "@media printer",
       *   }
       * });
       * ```
       *
       * then you can write ``` $`print/background:white` ``` which is expanded to
       * `@media printer { ... { background: white; } }`.
       *
       * Another example:
       *
       * ```
       * $.extend({
       *   conditions: {
       *     // override a screen size breakpoint.
       *     xl: "@media (min-width: 1700px)",
       *
       *     // dark mode modifier that uses preferes-color-scheme (see also selectors)
       *     dark: "@media (prefers-color-scheme: dark)",
       *
       *     // modifier to apply only browsers supporting CSS grid.
       *     hasgrid: "@supports (display: grid)",
       *   }
       * })
       * ```
       */
      conditions?: { [key: string]: string };

      /**
       * Define modifiers for selectors (e.g. :is()).
       *
       * The keys of the object will be modifier names.
       * The values must be `string` or `[string, string]`.
       * When the value is a string, it is appended to the selector.
       * When the value is an array, the first element is prependend,
       * the second element is appended to the selector.
       *
       * ```
       * $.extend({
       *   selmodifiers: {
       *     // dark mode modifier that uses className "dark".
       *     dark: ":is(.dark *)",
       *
       *     // dark mode modifier that uses a data attribute `data-darkmode`.
       *     dark: ":where([data-darkmode="true"], [data-darkmode="true"] *)",
       *   }
       * })
       * ```
       */
      selectors?: { [key: string]: string | [string, string] };
    },

    /**
     * Define property abbrevation.
     *
     * The keys of the object will be abbrevation names. The values are their expansion.
     * For example, the following declares a modifier `deco`:
     *
     * ```
     * $.extend({
     *   properties: {
     *     deco: "text-decoration",
     *   }
     * });
     * ```
     *
     * then you can write ``` $`deco:underline` ``` which is expanded to
     * `{ text-decoration: underline; }`.
     *
     * A special keyword `"<trbl>"` can be used in abbrevation names and their expansion.
     * In abbrevation names, it's treated as one of `["t", "r", "b", "l", "x", "y", "s", "e"]`.
     * In the corresponding expansion, it's treated as one of `["-top", "-right", ...]`.
     *
     * Other words separated by `"|"` and surrounded by angle brackets (<>) in abbrevation
     * names are expanded for each word. `"<>"` in the corresponding expansion will be replaced
     * by one of the words.
     *
     * Examples:
     *
     * ```
     * $.extend({
     *   properties: {
     *     // treated as:
     *     //  - "m": "margin",
     *     //  - "mt": "margin-top",
     *     //  - "mr": "margin-right",
     *     //  - ...
     *     "m<trbl>": "margin<trbl>",
     *
     *     // treated as:
     *     //  - "min-w": "min-width",
     *     //  - "max-w": "max-width",
     *     //  - "w": "width",
     *     "<min-|max-|>w": "<>width",
     *   }
     * });
     * ```
     */
    properties?: { [key: string]: string };

    colors?: { [colorName: string]: { [colorVal: string]: ColorStr } };
    num?: (v: number) => string;
    aliases?: { [key: string]: string };
    keyframes?: { [name: string]: string };
  }
}

export interface Upwind {
  (...args: (string | Upwind.ExtendedDOMCSSProperties)[]): () => string;
  extend(opts: Upwind.ExtendOptions): void;
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

const reNum = /^-?\d+(?:\.5)?$/;

function replaceValue(val: string[], config: Upwind.Config): void {
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

export function createUpwind(target?: Upwind.StyleSheetLike): Upwind {
  if (!target) {
    const el = document.createElement("style");
    document.head.appendChild(el);
    target = el.sheet!;
  }
  const sheet = createRootSheet(target);
  const addRule = (s: string) => sheet.addRule_(s);

  const config: Upwind.Config = {
    prefix: "",
    conditionNames: new Set(),
    selectorModifiers: createEmptyObj(),
    properties: createEmptyObj(),
    aliases: createEmptyObj(),
    colors: createEmptyObj(),
    colorRe: null,
    num: n => `${n / 4}rem`,
  };

  const makeCSSDeclarations = (name: string, value: string[]): string => {
    const { properties: propTable } = config;
    const propNames = propTable[name] ?? [name];
    replaceValue(value, config);
    return `${propNames.map(propName => `${propName}: ${value.join(" ")}`).join(";")}`;
  }

  const cacheTable = new Map<string, string>();
  const registered = new Set<string>();

  function register(name: string, value: string[], modifiers: Mod[], declRaw?: string): string {
    const { prefix, conditionNames: conditionNameTable, selectorModifiers: selmodsTable, } = config;
    const modPrefix = modifiers.map(m => m.raw).join(".");
    // escape " " to equivalent "_" because HTMLElement's `class` attribute uses " " as the delimiter.
    const className = (`${prefix}${modPrefix ? (modPrefix + ".") : ""}${declRaw || `${name}:${value.join("_")}`}`).replace(/ /g, "_");
    if (registered.has(className))
      return className;

    // wrap selector by selector modifiers (e.g. :active, :hover_peer~)
    let selector = "." + CSS.escape(className);
    let targetSheet: Sheet = sheet;
    for (let i = 0; i < modifiers.length; ++i) {
      const { modKey, target } = modifiers[i];
      if (modKey[0] === ":") {
        selector = target ? `.${target.name}${modKey} ${target.rel ?? ""} ${selector}` : `${selector}${modKey}`;
      } else if (conditionNameTable.has(modKey)) {
        targetSheet = targetSheet.sheetFor_(modKey);
      } else {
        const selmod = selmodsTable[modKey];
        if (selmod)
          selector = `${selmod[0]}${selector}${selmod[1]}`;
      }
    }

    targetSheet.addRule_(`${selector}{${makeCSSDeclarations(name, value)}}`);
    registered.add(className);
    return className;
  }

  function parseAndRegister(s: string): string {
    const cache = cacheTable.get(s);
    if (cache) return cache;

    const parsed = parse(s);
    if (parsed.val_.length === 0)
      return "";

    const { aliases: aliasTable } = config;
    const klasses = parsed.val_.map(decl => {
      const { mods, name, value, begin, end } = decl;
      return value ?
        register(name, value, mods, s.slice(begin, end)) :
        (aliasTable[name] ?? name); // no value (classname without ':') is treated as-is.
    });

    const ret = klasses.join(" ");
    cacheTable.set(s, ret);
    return ret;
  }

  function parseDOMCSSProperties(obj: Upwind.ExtendedDOMCSSProperties, modifiers: Mod[] = []): (string | (() => string))[] {
    let cond: (() => boolean) | undefined;
    const ret: (string | (() => string))[] = [];
    objForEach(obj, (v, k) => {
      if (v && typeof v === "object") {
        const mod = parseMod(k, 0)?.val_;
        if (mod)
          ret.push(...parseDOMCSSProperties(v, modifiers.concat(mod)));
      } else if (v != null) {
        // if (k === "$when")
        //   cond = v as unknown as (() => boolean);
        const vv = v as unknown as (string | number | (() => string | number | null | undefined));
        ret.push(
          isFunction(vv) ?
            (() => register(k, parseValRaw(vv()), modifiers)) :
            register(k, parseValRaw(vv), modifiers)
        );
      }
    });
    return ret;
  }

  function extend(opts: Upwind.ExtendOptions): void {
    const { prefix, modifiers, properties, aliases, colors, keyframes, num } = opts;
    const { conditions, selectors } = modifiers || {};

    if (prefix != null)
      config.prefix = prefix;

    if (conditions) {
      objForEach(conditions, (v, k) => {
        config.conditionNames.add(k);
        sheet.registerConditional_(k, v);
      });
    }

    if (selectors) {
      objForEach(selectors, (v, k) => {
        config.selectorModifiers[k] = isString(v) ? ["", v] : v;
      });
    }

    if (properties) {
      const dest = config.properties;
      objForEach(properties, (v, k) => {
        const m = k.match(/<([^>]*)>/);
        if (m) {
          if (m[1] === "trbl") {
            for (const [abbrev, expanded] of trbl)
              dest[k.replace(m[0], abbrev)] = mapCoerce(expanded, e => v.replace(m[0], e));
          } else {
            for (const part of m[1].split("|"))
              dest[k.replace(m[0], part)] = [v.replace("<>", part)];
          }
        } else {
          dest[k] = [v];
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
          const cssdecl = value ? makeCSSDeclarations(name, value) : (aliasTable[name] ?? "");
          return `${timings}{${cssdecl}}`;
        }).join("");
        addRule(`@keyframes ${k} {${rules}}`);
      });
    }
  }

  const ret = (...args: (string | Upwind.ExtendedDOMCSSProperties)[]): () => string => {
    const cs: (string | (() => string))[] = [];
    for (const arg of args) {
      if (isString(arg))
        cs.push(parseAndRegister(arg));
      else
        cs.push(...parseDOMCSSProperties(arg));
    }
    const dyns = cs.map((v, i) => isString(v) ? null : [i, v] as const).filter(x => x != null);
    const base = cs.slice();
    return () => {
      for (const [i, v] of dyns)
        base[i] = v();
      return base.join(" ");
    }
  };

  ret.extend = extend;
  ret.add = addRule;
  return ret;
}
