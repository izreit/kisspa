export function assertNonNullish<T>(val: T, msg: string): asserts val is NonNullable<T>;
export function assertNonNullish<T, U>(val: T, msgFun: (arg: U) => string, errorInfoObj: U): asserts val is NonNullable<T>;
export function assertNonNullish<T, U>(val: T, msgOrFun: string | ((arg: U) => string), errorInfoObj?: U): asserts val is NonNullable<T> {
  if (val == null)
    throw new Error((typeof msgOrFun === "function") ? msgOrFun(errorInfoObj!) : msgOrFun);
}

export function assertNullish<T>(val: T | null | undefined, msg: string | (() => string)): asserts val is (null | undefined);
export function assertNullish<T, U>(val: T | null | undefined, msgFun: (arg: U) => string, errorInfoObj: U): asserts val is (null | undefined);
export function assertNullish<T, U>(val: T | null | undefined, msgOrFun: string | (() => string) | ((arg: U) => string), errorInfoObj?: U): asserts val is (null | undefined) {
  if (val != null)
    throw new Error((typeof msgOrFun === "string") ? msgOrFun : msgOrFun(errorInfoObj!));
}

export function assert(val: boolean, msg: string | (() => string)): asserts val;
export function assert<U>(val: boolean, msgFun: (arg: U) => string, errorInfoObj: U): asserts val;
export function assert<U>(val: boolean, msgOrFun: string | ((arg: U) => string), errorInfoObj?: U): asserts val {
  if (!val)
    throw new Error((typeof msgOrFun === "string") ? msgOrFun : msgOrFun(errorInfoObj!));
}

export function fail(msg: string | (() => string)): never;
export function fail<U>(msgFun: (arg: U) => string, errorInfoObj: U): never;
export function fail<U>(msgOrFun: string | ((arg: U) => string), errorInfoObj?: U): never {
  throw new Error((typeof msgOrFun === "string") ? msgOrFun : msgOrFun(errorInfoObj!));
}

export function unreachable(v: never): never {
  fail("should not reach here");
}
