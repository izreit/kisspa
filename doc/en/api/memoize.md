# memoize()

Creates a signal that recomputes a value when its dependencies change.
It caches the latest result.

## Syntax

```ts
const memoizedFun = memoize(compute);
```

### Parameters

|Name|Type|Description|
|:---|:---|:---|
|`compute`|`() => T`|function that reads reactive values.|

### Return value

A function `() => T`, getter returning the latest computed value.

## Description

`memoize()` uses `createEffect()` + `createSignal()` under the hood.
When dependencies read inside `compute` change, the getter’s value updates.

`memoize()` is useful when the `compute` itself is a heavy task.
Becaues when `compute` is called in a effect (function passed to `createEffect()`),
it's automatically called again whenever any reactive values refered in the effect are changed.

```ts
import { createStore, memoize } from "kisspa";

const [store, setStore] = createStore({
  name: "john",
  value: 42
});

// --- Inefficient version ---
const valueIsPrime = () => {
  return ... // returns whether or not store.value is a prime number (so heavy calculation for big numbers)
};
createEffect(() => {
  // This effect will call `valueIsPrime()` again even if only `store.name` is changed.
  console.log(`Hi ${store.name}, ${store.value} is ${valueIsPrime() ? "" : "not "} a prime number.`;
});

// --- Efficient version ---
const valueIsPrimeMemoized = memoize(valueIsPrime);
createEffect(() => {
  // The result of `valueIsPrimeMemoized()` is cached and then
  // this effect will calle the wrapped `valueIsPrime()` again only if `store.value` is changed.
  console.log(`Hi ${store.name}, ${store.value} is ${valueIsPrimeMemoized() ? "" : "not "} a prime number.`;
});
```

## Related

- [`createEffect()`](./create-effect.md)
- [`createSignal()`](./create-signal.md)

