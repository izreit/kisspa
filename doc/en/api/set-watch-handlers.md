# setWatchHandlers()

Installs or removes low-level watch handlers to observe internal mutations.

**INTERNAL**: don't use. Use `addWatchHandlers()` instead.

## Syntax

```ts
setWatchHandlers(handlers);
```

## Parameters

|Name|Type|Description|
|:---|:---|:---|
|`handlers`|`WatchHandlers \| null`|recerivers for mutation callbacks.|

## Return value

None.

## Types

```ts
export interface WatchHandlers {
  watches(target: object): boolean; // return true to observe this target
  flush(): void;                    // called after a batch flush
  call(target: object, fn: any, args: any): void; // mutating method call
  set(
    target: object,
    prop: string | symbol | number,
    val: any,
    prev: any,
    isDelete: boolean,
    isCallAlternative: boolean
  ): void; // property set/delete
}
```

## Description

When set, the runtime calls `handlers.set` on property writes/deletes
and `handlers.call` on mutating method calls (e.g., array methods).

Use this to build devtools or logs.
Pass `null` to disable.

## Related

- [`createStore()`](./create-store.md)
