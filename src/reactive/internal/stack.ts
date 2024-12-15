export interface ScopedStack<T> {
  top_(): T | null | undefined;
  callWith_<U>(f: () => U, val?: T | null): U;
}

export function createScopedStack<T>(): ScopedStack<T> {
  const stack: (T | null | undefined)[] = [];
  return {
    top_: () => stack[stack.length - 1],
    callWith_(f, val) {
      try {
        stack.push(val);
        return f();
      } finally {
        stack.pop();
      }
    }
  };
}
