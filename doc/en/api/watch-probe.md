# watchProbe\<T>()

Watches the result of a probe function.
Calls a callback when it changes.

## Syntax

```ts
watchProbe(probe, callback[, cond]);
```

## Parameters

|Name|Type|Description|
|:---|:---|:---|
|`probe`|`() => T`|reads reactive values and returns a value to watch.|
|`callback`|`(current: T, previous: T \| undefined) => void`|called on change.|
|`cond`|`(current: T, previous: T) => boolean` (optional)|change detector.|

## Return value

A function `() => void` that cancels the watcher.

## Description

`watchProbe()` is a higher-level primitive built on `createEffect()`.

It compares the current and previous probe results using `cond` and invokes `callback` on changes.
Useful for reacting to aggregated values.

If `cond` is not given, it defaults to shallow comparator.
(i.e. if `current` and `previous` are both arrays check whether or not all their elements are identical with `===`, otherwise comapre themselves with `===`.)

## Examples

```ts
import { watchProbe, observe } from "kisspa";

const [state, set] = observe({ xs: [1, 2] });

const stop = watchProbe(() => state.xs.length, (cur, prev) => {
  console.log("len:", prev, "->", cur);
});

set((s) => { s.xs.push(3); });
stop();
```

## Related
- [`createEffect()`](./create-effect.md)
- [`decimated()`](./decimated.md)
