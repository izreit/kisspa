export const isArray = Array.isArray;

export function arrayify<T>(v: NonNullable<T> | T[] | null | undefined): T[] {
  return isArray(v) ? v : (v != null ? [v] : []);
}

export function lastOf<T>(vs: T[]): T | null {
  const l = vs.length;
  return (l > 0) ? vs[l - 1] : null;
}

export function mapCoerce<T, U>(xs: T | T[] | null | undefined, f: (x: T) => U): U[] {
  return (isArray(xs)) ? xs.map(f) : (xs ? [f(xs)] : []);
}
