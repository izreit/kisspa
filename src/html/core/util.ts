export type Arrayify<T> = T extends undefined | null ? [] : T;

// Shorthands for minifiable code.
export const isArray = Array.isArray;
export const objEntries = <T>(o: { [key: string]: T }): [string, T][] => Object.entries(o);

export const lastOf = <T>(vs: T[]): T | null => vs.length ? vs[vs.length - 1] : null;
export const pushFuncOf = <T>(a: T[]): ((v: T) => number) => (v: T) => a.push(v);

// Shorthands of typeof for minifier-friendly code.
// Do not use them in bottlenecks where extra function calls can't be tolerated.
export const isString = (v: any): v is string => typeof v === "string";
export const isFunction = (v: any): v is Function => typeof v === "function";
export const isPromise = (v: any): v is Promise<any> => v && isFunction(v.then);
export const isNode = (v: object): v is Node => "nodeName" in v;
export const isStrOrNumOrbool = (v: any): v is number | string | boolean => (
  typeof v === "string" || typeof v === "number" || typeof v === "boolean"
);

export const doNothing = () => {};

export function mapCoerce<T, U>(xs: T | T[] | null | undefined, f: (x: T) => U): U[] {
  return isArray(xs) ? xs.map(f) : (xs != null ? [f(xs)] : []);
}
