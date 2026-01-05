# bindObserver()

Bind a callback so it re-enters a specific observer (usually the current effect) whenever it runs later.
Use it when handing reactive logic to external schedulers or event emitters that would otherwise run outside the reactive stack.

## Syntax

```ts
const wrapped = bindObserver(fun[, observer]);
```

### Parameters

|Name|Type|Description|
|:---|:---|:---|
|`fun`|`(...args: A) => R`|Callback whose execution should be tracked by an observer.|
|`observer`|`() => void` (optional)|Observer to bind to. Defaults to the observer that is active when `bindObserver()` is called (for example, the current `createEffect()`).|

### Return value

A new function with the same signature as `fun`. When invoked, it enters the bound observer before running `fun` and registers any reactive reads to that observer.

## Description

Reactive observers (effects) only track dependencies while they are running.
If you pass one of their callbacks to something that fires later (timers, DOM listeners, async libraries), the callback would normally run outside the observer and reactive reads inside it would be ignored.

`bindObserver()` solves that by wrapping the callback so it temporarily restores the observer when the callback fires. Any stores or signals read inside the wrapper are tracked for that observer, so future updates still rerun the owning effect.

Call `bindObserver()` inside an effect to capture that effect automatically. Supply the `observer` argument only if you need to bind to a specific effect manually.
To explicitly opt out of tracking, use [`withoutObserver()`](./without-observer.md) instead.

## Related

- [`createEffect()`](./create-effect.md)
- [`withoutObserver()`](./without-observer.md)
