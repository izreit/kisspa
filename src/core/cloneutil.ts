import type { Key } from "./core";

export namespace cloneutil {
  export function cloneDeep<T>(val: T): T {
    return (
      (Array.isArray(val)) ?
        val.map(v => cloneDeep(v)) as any as T :
      (typeof val === "object" && val != null) ?
        (Object.keys(val) as (keyof T)[]).reduce((acc, k) => (acc[k] = cloneDeep(val[k]), acc), {} as T) :
      val
    );
  }

  export function assign(target: any, path: readonly Key[], val: any, del?: boolean): void {
    for (let i = 0; i < path.length - 1; ++i)
      target = target[path[i]];
    if (!del) {
      target[path[path.length - 1]] = val;
    } else {
      delete target[path[path.length - 1]];
    }
  }

  export function apply(target: any, path: readonly Key[], fun: Function, args: any[]): void {
    for (let i = 0; i < path.length; ++i)
      target = target[path[i]];
    fun.apply(target, args);
  }
}
