export type MemberType<P, Key> = Key extends keyof P ? P[Key] : never;
export type Arrayify<T> = T extends undefined | null ? [] : T;

export const isArray = Array.isArray;

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

export function isPromise(v: any): v is Promise<any> {
  return typeof v?.then === "function";
}

export const objEntries = <T>(o: { [key: string]: T }): [string, T][] => Object.entries(o);
