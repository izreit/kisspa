export type Key = string | symbol | number;
export type Target = object;
export type Wrapped = object;
export type Observer = () => void;

export interface WatchHandlers {
  watches(target: Wrapped): boolean;
  flush(): void;
  call(target: Wrapped, self: any, args: any): void;
  set(target: Wrapped, prop: Key, val: any, prev: any, isDelete: boolean, isCallAlternative: boolean): void;
}

// Ugh! A dummy value to force tsc to generate .js file.
//
// tsc doesn't generate .js for type-only .ts and it breaks
// imports with file extensions (e.g. import "foo.js").
const _ = 0;
