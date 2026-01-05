# createRef\<T>()

Create a mutable ref object for capturing DOM nodes or component instances.

## Syntax

```ts
const ref = createRef<T>();
```

### Parameters

None.

### Return value

A `Ref<T>` value, object whose `.value` property, tracks the latest assigned value.

## Description

`createRef()` produces a `Ref<T>` initialized with `null`.

When you pass the ref to the `ref` attribute of an JSX element, Kisspa assigns the underlying value (DOM element) during mount to its `.value`.
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

- [`onMount()`](./on-mount.md)
- [`attach()`](./attach.md)
