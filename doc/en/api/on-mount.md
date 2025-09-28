# onMount()

Register a callback that runs after the component mounts.

## Syntax

```ts
onMount(handler);
```

### Parameters

|Name|Type|Description|
|:---:|:---:|:---|
|`handler`|`() => void`|Callback invoked once, after the component is attached to the DOM and ready.|

### Return value

`void`.

## Description

Use this to queue work that must happen after the DOM is in place - such as measuring layout, focusing an element, or wiring imperative APIs.
The callback runs after the component successfully mounts, including after any surrounding [`Suspense`](./suspense.md) has resolved.
Can be called only in components.

Nested calls are allowed; handlers registered inside other `onMount` handlers run later in the same cycle.

Handlers are not invoked if the component never finishes mounting (for example, if it is removed before awaiting promises). Combine `onMount` with [`onCleanup()`](./on-cleanup.md) to mirror the setup/teardown lifecycle.

`onMount()` is a shorthand for `useComponentMethods().onMount(handler)`.
In async components, `onMount()` must be called synchronously (i.e. before any `await`).
If you need to call this asynchronously, use `useComponentMethods()` instead.

## Examples

```ts
import { createRef, onMount, onCleanup } from "kisspa";

function AutoFocusInput() {
  const inputRef = createRef<HTMLInputElement>();

  onMount(() => {
    inputRef.value?.focus();
    const listener = () => console.log("focused");
    inputRef.value?.addEventListener("focus", listener);
    onCleanup(() => inputRef.value?.removeEventListener("focus", listener));
  });

  return <input ref={inputRef} type="text" />;
}
```

## Related

- [`useComponentMethods()`](./use-component-methods.md)
- [`onCleanup()`](./on-cleanup.md)
- [`Suspense`](./suspense.md)
