# createStore\<T>()

Create a store (a reactive object).
Returns a read-only view and a setter for batched writes.

## Syntax

```ts
const [store, setStore] = createStore(initial);
```

### Parameters

|Name|Type|Description|
|:---|:---|:---|
|`initial`|`object` (`T`)|value to be observed.|

### Return value

A pair, `[store, setStore]`.

|Name|Type|Description|
|:---:|:---:|:---|
|`store`|`T`|read proxy that tracks property reads.|
|`setStore`|`StoreSetter<T>`|setter function.|

## Description

`createStore()` creates a reactive value (a store) and a setter for it.

Reads from `store` track dependencies for `createEffect()`.

Use `setStore(writer)` to mutate the store.
`writer` must be a function that takes the write-proxy as the only argument.
Mutations made on the write-proxy are reflected to the store and causes related effects to be re-run.

By default changes in `setStore()` flush immediately, or pass `{ lazyFlush: true }` as the second argument to defer.

## Signatures

```ts
// Setter signature
export type StoreSetter<T> = (writer: (val: T) => void, opts?: StoreSetterOptions) => void;

// Setter options
export interface StoreSetterOptions {
  lazyFlush?: boolean; // defer flushing until later
}
```

## Examples

```ts
import { createStore, createEffect } from "kisspa";

const [todoStore, setTodoStore] = createStore({ items: [] as string[] });

// prints the count of todo items immediately and whenever it's changed.
createEffect(() => {
  console.log(todoStore.items.length);
});

// modify the store and causes the above effect re-run.
setTodoStore((s) => {
  s.items.push("Read docs");
});
```

## Related

- [`createEffect()`](./create-effect.md)
- [`unwrap()`](./unwrap.md)
