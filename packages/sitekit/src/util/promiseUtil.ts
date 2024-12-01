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
