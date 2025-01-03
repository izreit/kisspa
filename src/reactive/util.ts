import { autorun, bindObserver, cancelAutorun, observe } from "./core";
import { decimated } from "./decimated";

export interface AutorunDecimatedResult {
  fun: () => Promise<void>;
  cancel: () => void;
}

export function autorunDecimated(f: () => void): AutorunDecimatedResult {
  function recursiveHack() { ret(); }
  const ret = decimated(bindObserver(f, recursiveHack));
  autorun(recursiveHack);
  return {
    fun: ret,
    cancel: () => {
      ret.dispose();
      cancelAutorun(recursiveHack);
    }
  };
}

export function watchProbe<T>(
  probe: () => T,
  fun: (current: T, previous: T | undefined) => void,
  cond: (current: T, prevous: T) => boolean = shallowNotEqual
): () => void {
  let prev: T | undefined;
  return autorun(() => {
    const cur = probe();

    // Update `prev' before calling fun() because fun() may reach here recursively by modifying other values.
    // This is not the essential solution for recursive call of autorun() (since not all values cannot be
    // comapred by the === operator). Users may need to wrap fun() by decimated().
    const p = prev;
    prev = cur;

    if (p === undefined || cond(cur, p))
      fun(cur, p);
  });
}

export function signal<T>(val: T): [() => T, (v: T) => void] {
  const [store, set] = observe({ v: val });
  return [() => store.v, v => set(s => { s.v = v; })];
}

export function memoize<T>(f: () => T): () => T {
  const [sig, set] = signal<T>(null!);
  autorun(() => set(f()), sig);
  return sig;
}

function shallowNotEqual<T>(xs: T | T[], ys: T | T[]): boolean {
  if (!Array.isArray(xs) || !Array.isArray(ys))
    return xs !== ys;
  if (xs.length !== ys.length) return true;
  for (let i = 0; i < xs.length; ++i)
    if (xs[i] !== ys[i]) return true;
  return false;
}
