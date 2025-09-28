# createRef<T>()

Create a mutable ref object for capturing DOM nodes or component instances.

## Syntax

```ts
const ref = createRef<T>();
```

### Parameters

None.

### Return value

|Type|Description|
|:---:|:---|
|[`Ref<T>`](./ref.md)|Object whose `.value` property tracks the latest assigned value.|

## Description

`createRef()` produces a [`Ref`](./ref.md) initialized with `null`. When you pass the ref to the `ref` attribute of an element or component, Kisspa assigns the underlying value during mount to its `.value`. The `.value` property always reflects the most recent assignment, making refs ergonomic to use in imperative code or lifecycle handlers.
The `.value` property will be `null` on cleanup.

Refs integrate with the lifecycle helpers: they receive their mounting value before `onMount()` handlers run and are cleared before `onCleanup()` handlers execute.

## Examples

```tsx
import { createRef, onMount } from "kisspa";

function Form() {
  const inputRef = createRef<HTMLInputElement>();

  onMount(() => {
    inputRef.value?.focus();
  });

  return (
    <label>
      Name
      <input ref={inputRef} type="text" />
    </label>
  );
}
```

## Related

- [`Ref`](./ref.md)
- [`onMount()`](./on-mount.md)
- [`attach()`](./attach.md)
