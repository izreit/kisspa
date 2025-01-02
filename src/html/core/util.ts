export type Arrayify<T> = T extends undefined | null ? [] : T;

// Shorthands for minifiable code.
export const isArray = Array.isArray;
export const objEntries = <T>(o: { [key: string]: T }): [string, T][] => Object.entries(o);

export function arrayify<T>(v: T | T[] | null | undefined): T[] {
  return isArray(v) ? v : (v != null ? [v] : []);
}

export function lastOf<T>(vs: T[]): T | null {
  const l = vs.length;
  return l ? vs[l - 1] : null;
}

export function mapCoerce<T, U>(xs: T | T[] | null | undefined, f: (x: T) => U): U[] {
  return (isArray(xs)) ? xs.map(f) : (xs != null ? [f(xs)] : []);
}

// Shorthands of typeof for minifier-friendly code.
// Do not use them in bottlenecks where extra function calls can't be tolerated.
export const isString = (v: any): v is string => typeof v === "string";
export const isFunction = (v: any): v is Function => typeof v === "function";
export const isPromise = (v: any): v is Promise<any> => v && isFunction(v.then);
export const isNode = (v: object): v is Node => "nodeName" in v;

export const doNothing = () => {};
