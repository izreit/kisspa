# cancelEffect()

Cancels the effect (created by `createEffect()`) and its descendant effects.

## Syntax

```ts
cancelEffect(fun);
```

### Parameters

|Name|Type|Description|
|:---|:---|:---|
|`fun`|`() => void`|the effect function originally passed to `createEffect()`.|

### Return value

None.

## Description

`cancelEffect()` unregisters `fun` from all dependencies and clears its nested observers so it no longer re-runs on changes.

This is the programmatic equivalent of calling the disposer returned by `createEffect()`.

## Examples

```ts
import { createEffect, cancelEffect } from "kisspa";

const fun = () => { /* ... */ };
createEffect(fun);

// later
cancelEffect(fun);
```

## Related

- [`createEffect()`](./create-effect.md)
