import { bindObserver, cancelEffect, createEffect, createStore } from "./core.js";
import { decimated } from "./decimated.js";

export interface CreateDecimatedEffectResult {
  fun: () => Promise<void>;
  cancel: () => void;
}

export function createDecimatedEffect(f: () => void): CreateDecimatedEffectResult {
  function recursiveHack() { ret(); }
  const ret = decimated(bindObserver(f, recursiveHack));
  createEffect(recursiveHack);
  return {
    fun: ret,
    cancel: () => {
      ret.dispose();
      cancelEffect(recursiveHack);
    }
  };
}

export function watchProbe<T>(
  probe: () => T,
  fun: (current: T, previous: T | undefined) => void,
  cond: (current: T, prevous: T) => boolean = shallowNotEqual
): () => void {
  let prev: T | undefined;
  return createEffect(() => {
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

export function createSignal<T>(val: T): [() => T, (v: T) => void] {
  const [store, set] = createStore({ v: val });
  return [() => store.v, v => set(s => { s.v = v; })];
}

export function memoize<T>(f: () => T): () => T {
  const [sig, set] = createSignal<T>(null!);
  createEffect(() => set(f()), sig);
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
