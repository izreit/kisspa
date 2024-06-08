const cache: WeakMap<Function, Function> = new WeakMap();

export interface DecimatedFun {
  (): Promise<void>;
  immediate(): void;
  dispose(): void;
}

export function decimated(fun: () => void): DecimatedFun {
  if (cache.has(fun))
    return (cache.get(fun) as DecimatedFun);

  let f: (() => void) | null = fun;
  let p: Promise<void> | null = null;

  function fire() {
    if (!p) return;
    p = null;
    f?.();
  }

  const ret = function decimatedFun() {
    return p ?? (p = Promise.resolve().then(fire));
  } as DecimatedFun;

  ret.immediate = () => {
    p = null;
    f?.();
  };

  ret.dispose = () => {
    f = null;
  };

  cache.set(fun, ret);
  return ret;
}
