# withoutObserver<T>()

Executes a function without tracking any reactive dependencies.

## Syntax

```ts
withoutObserver(fun);
```

## Parameters

|Name|Type|Description|
|:---:|:---:|:---|
|`fun`|`() => T`|function to run outside of any observer.|

## Return value

The return value of `fun`.

## Description

Use `withoutObserver()` to perform reads/mutations that should not register as dependencies
(e.g., logging or imperative setup inside effects).

## Examples

```ts
import { createEffect, withoutObserver } from "kisspa";

createEffect(() => {
  withoutObserver(() => {
    // Although in an effect, reading reactive state here will not be tracked
  });
});
```

## Related

- [`bindObserver()`](./bind-observer.md)
- [`createEffect()`](./create-effect.md)

