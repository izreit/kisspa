export function arrayify<T>(v: NonNullable<T> | T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : (v != null ? [v] : []);
}

export function lastOf<T>(vs: T[]): T | null {
  const l = vs.length;
  return (l > 0) ? vs[l - 1] : null;
}
