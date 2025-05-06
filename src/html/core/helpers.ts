/**
 * Utility type: either given type T or function returns T (i.e. `(() => T)`).
 *
 * Many props need to accept both static and dynamic values.
 * For example, the `name` prop of the following:
 *  - `<NameCard name="John" />`
 *  - `<NameCard name={() => currentUesr.name} />
 * So props are often typed as like `(string | (() => string))`.
 *
 * `Prop<T> is a helper for this.
 * `Props<string>` can be used as `string | (() => string)`.
 */
export type Prop<T> = [T] extends [Function] ? never : (T | (() => T));

/**
 * Pick the value from given Prop<T>.
 *
 * @param p target Prop<T>.
 */
export function deprop<T>(p: Prop<T>): T {
  return (typeof p === "function") ? p() : p as T;
}
