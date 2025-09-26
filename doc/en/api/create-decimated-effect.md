# createDecimatedEffect()

Combines `createEffect()` and `decimated()`.
Tracks dependencies and debounces re-runs to the next microtask.

## Syntax

```ts
const { fun, cancel } = createDecimatedEffect(fun);
```

### Parameters

|Name|Type|Description|
|:---:|:---:|:---|
|`fun`|`() => void`|reactive function to run|

### Return value

An object that has the following properties:

|Name|Type|Description|
|:---:|:---:|:---|
|`fun`|`() => void`|decimated runner.|
|`cancel`|`() => void`|disposes effect.|

## Description

Use when effects may fire rapidly (e.g., many writes in quick succession).

`fun()` can be used to manually schedule an execution.
`cancel()` disposes both the underlying decimator and the effect.

## Examples

```ts
import { createDecimatedEffect } from "kisspa";

const { fun, cancel } = createDecimatedEffect(() => {
  // read reactive state here
});

fun(); // schedule manually
cancel();
```

## Signatures

```ts
interface CreateDecimatedEffectResult {
  fun: () => Promise<void>;
  cancel: () => void;
}

function createDecimatedEffect(f: () => void): CreateDecimatedEffectResult;
```

## Related

- [`createEffect()`](./create-effect.md)
- [`decimated()`](./decimated.md)
