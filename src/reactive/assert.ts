export function assert(val: boolean, msg: string | (() => string)): asserts val;
export function assert<U>(val: boolean, msgFun: (arg: U) => string, errorInfoObj: U): asserts val;
export function assert<U>(val: boolean, msgOrFun: string | ((arg: U) => string), errorInfoObj?: U): asserts val {
  if (!val)
    throw new Error((typeof msgOrFun === "string") ? msgOrFun : msgOrFun(errorInfoObj!));
}

export function unreachable(_: never): never {
  throw new Error("unreachable");
}
