export function throwError(s: string): never {
  throw new Error(s);
}

export function assert(val: boolean, msg: string): asserts val {
  if (!val)
    throwError(msg)
}

export function unreachable(_: never): never {
  throwError("unreachable");
}

export function dceNeverReach(): never {
  throwError("only available in the full build");
}
