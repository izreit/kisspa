# createEffect()

Make a given function an effect.

## Syntax

```ts
createEffect(fun);
createEffect(fun, owner);
```

### Parameters

|Name|Type|Description|
|:---:|:---:|:---|
|`fun`|`() => void`|function that reads store values.|
|`owner`|`object` (optional)|if provided, GC can auto-cancel the effect.|

### Return value

A function (`() => void`) to cancel the effect.

## Description

`createEffect()` runs `fun()` immediately and tracks all reads occurring inside it on reactive values
(i.e. stores created by `createStore()`).
When any of those properties change, `fun` is scheduled to run again after a flush cycle.

We call `fun`, functions passed to `createEffect()` an **effect**.

Any nested effects (i.e. `createEffect()` called in effects) are
automatically cancelled when the outside (ancestor) effect is called again.

The second argument `owner` is an experimental, advanced option.
If passed, re-running are cancelled when `owner` is collected by GC.
Note that any value refered from `effect` will not be collected
unless all reactive values refered from `effect` are collected.

## Examples

```ts
import { createStore, createEffect } from "kisspa";

const [state, set] = createStore({ count: 0 });
const stop = createEffect(() => {
  console.log(state.count);
});

set((s) => { s.count++; }); // logs updated count
stop();
```

## Related

- [`createStore()`](./create-store.md)
- [`cancelEffect()`](./cancel-effect.md)
- [`bindObserver()`](./bind-observer.md)
- [`requestFlush()`](./request-flush.md)
