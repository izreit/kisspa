import { parse } from "./parser";

export namespace Tag {
  export type ColorStr = string;

  export interface ExtendOptions {
    root?: string;
    breakpoints?: { [key: string]: string };
    key?: { [key:string]: string };
    color?: { [key:string]: ColorStr | { [key: string]: ColorStr } };
  }
}

export interface Tag {
  (strs: TemplateStringsArray, ...exprs: (string | (() => string))[]): () => string;
  extend(opts: Tag.ExtendOptions): void;
}

function escape(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, c => "\\" + c);
}

export function createTag(): Tag {
  // Note that `new CSSStyeSheet()` is't suported by Safari as of 16.4 (2023-03-27).
  const el = document.createElement("style");
  document.head.appendChild(el);
  const sheet = el.sheet!;

  const cacheTable = new Map<string, string>();
  const registered = new Set<string>();

  function parseAndRegister(s: string, checkFirst: boolean, checkLast: boolean): string {
    const cache = cacheTable.get(s);
    if (cache) return cache;

    const { ast, errs } = parse(s);
    if (errs.length > 0 || !ast || ast.val.length === 0) {
      errs.forEach(e => console.error(JSON.stringify(s), e.toString()));
      return "";
    }

    if (checkFirst && ast.beginpos.overallPos === 0)
      console.warn(`upwind: ${JSON.stringify(s)} should begin with " " since treated as if there.`);
    if (checkLast && ast.endpos.overallPos === s.length - 1)
      console.warn(`upwind: ${JSON.stringify(s)} should end with " " since treated as if there.`);

    const klasses = ast.val.map(decl => {
      const { contexts, name, value, begin, end } = decl;
      const def = s.slice(begin, end);
      const prefix = contexts.join(".");
      const klass = `${prefix ? (prefix + ".") : ""}${def}`;
      if (!registered.has(klass)) {
        const style = `.${escape(klass)} { ${name.join("-")}: ${value.join(" ")} }`;
        sheet.insertRule(style);
        registered.add(klass);
      }
      return klass;
    });

    const ret = klasses.join(" ");
    cacheTable.set(s, ret);
    return ret;
  }

  const ret = (strs: TemplateStringsArray, ...exprs: (string | (() => string))[]): () => string => {
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
  };

  return ret as Tag;
}
