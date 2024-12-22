export function createLogBuffer() {
  let buffer: string[] = [];
  return {
    log: (s: string) => {
      buffer.push(s);
    },
    reap: () => {
      const ret = buffer;
      buffer = [];
      return ret;
    }
  };
}

export interface SeparatedPromise<T> extends Promise<T> {
  resolve(v: T): void;
  reject(e: unknown): void;
}

export function createSeparatedPromise<T = void>(): SeparatedPromise<T> {
  let resolve: (v: T) => void;
  let reject: (e: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  }) as SeparatedPromise<T>;
  promise.resolve = resolve!;
  promise.reject = reject!;
  return promise;
}
