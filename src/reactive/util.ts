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

export function watchProbe<T>(probe: () => T, fun: (current: T, previous: T | undefined) => void): () => void {
  let prev: T | undefined = undefined;
  return autorun(() => {
    const cur = probe();
    if ((Array.isArray(cur) && Array.isArray(prev)) ? arrayEqual(cur, prev) : cur === prev) return;

    // Update `prev' before calling fun() because fun() may reach here recursively by modifying other values.
    // This is not the essentical solution for recursive call of autorun() (since not all values cannot be
    // comapred by the === operator). Users may need to wrap fun() by decimated().
    const p = prev;
    prev = cur;

    fun(cur, p);
  });
}

export function signal<T>(val: T): [() => T, (v: T) => void] {
  const [store, set] = observe({ v: val });
  return [() => store.v, v => set(s => { s.v = v; })];
}

function arrayEqual<T extends unknown[]>(xs: T, ys: T[]): boolean {
  if (xs.length !== ys.length) return false;
  for (let i = 0; i < xs.length; ++i)
    if (xs[i] !== ys[i]) return false;
  return true;
}
