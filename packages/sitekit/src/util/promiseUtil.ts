export interface FloatingPromise<T> extends Promise<T> {
  resolveWith(v: T): void;
  rejectWith(err: unknown): void;
}

export function createFloatingPromise<T>(): FloatingPromise<T> {
  let res: (v: T) => void;
  let rej: (err: unknown) => void;
  const p = new Promise<T>((resolve, reject) => {
    res = resolve;
    rej = reject;
  }) as FloatingPromise<T>;

  p.resolveWith = res!;
  p.rejectWith = rej!;
  return p;
}

export interface NestCountPromise extends Promise<void> {
  withCount(fun: () => Promise<void>): Promise<void>;
}

export function createNestCountPromise(): NestCountPromise {
  const p = createFloatingPromise<void>();
  const ret = p as Promise<void> as NestCountPromise;

  let count = 0;
  ret.withCount = async (fun) => {
    try {
      ++count;
      return await fun();
    } finally {
      --count;
      if (count === 0)
        p.resolveWith();
    }
  };
  return ret;
}
