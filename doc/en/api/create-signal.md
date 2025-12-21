# createSignal\<T>()

## Abstract

Creates a minimal reactive cell with a getter and setter.

## Syntax

```ts
const [get, set] = createSignal(initial);
```

|Name|Type|Description|
|:---|:---|:---|
|`initial`|`any` (`T`)|initial value|

## Return value

A pair, `[get, set]`.

|Name|Type|Description|
|:---:|:---:|:---|
|`get`|`() => T`|getter|
|`set`|`(v: T) => void`|setter|

## Description

`createSignal()` is built on `createStore()`.
The setter updates a tiny `{ v }` store; the getter returns the current `v`.

Suitable for scalar state or as a building block for computed values.

## Examples

```ts
import { createSignal } from "kisspa";

const [count, setCount] = createSignal(0);
setCount(count() + 1);
```

## Related

- [`createStore()`](./create-store.md)
- [`memoize()`](./memoize.md)
