const cache: WeakMap<Function, DecimatedFun> = new WeakMap();

export interface DecimatedFun {
  (): Promise<void>;
  immediate(): void;
  dispose(): void;
}

export function decimated(fun: () => void): DecimatedFun {
  const c = cache.get(fun);
  if (c) return c;

  let f: (() => void) | null = fun;
  let p: Promise<void> | null | undefined;

  const immediate = () => {
    p = null;
    f?.();
  };

  const fire = () => { p && immediate() };
  const ret = (() => (p ?? (p = Promise.resolve().then(fire)))) as DecimatedFun;
  ret.immediate = immediate;
  ret.dispose = () => {
    f = null;
  };

  cache.set(fun, ret);
  return ret;
}
