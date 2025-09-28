# onCleanup()

Register a teardown callback that runs when the component is disposed.

## Syntax

```ts
onCleanup(handler);
```

### Parameters

|Name|Type|Description|
|:---|:---|:---|
|`handler`|`() => void`|Callback invoked in reverse registration order when the component detaches.|

### Return value

None.

## Description

Register a teardown callback, called when the component is disposed - either because the tree was replaced, the enclosing [`Show`](./show.md)/[`Switch`](./switch.md) hid it, or the root was detached.
Can be called only in components.

Handlers execute only if the component previously mounted. For example, ignored when async setup never resolves.

Multiple handlers are supported. They are called in last-in-first-out order so that nested resources can be cleaned up safely.

`onCleanup()` is equivalent to `useComponentMethods().onCleanup(handler)`.
In async components, `onCleanup()` must be called synchronously (i.e. before any `await`).
If you need to call this asynchronously, use `useComponentMethods()` instead.

## Examples

```ts
import { onMount, onCleanup } from "kisspa";

function SubscriptionBadge() {
  let unsubscribe: (() => void) | undefined;

  onMount(() => {
    unsubscribe = subscribeToUnread(count => {
      document.title = `(${count}) Inbox`;
    });
  });

  onCleanup(() => unsubscribe?.());

  return <span>Inbox</span>;
}
```

## Related

- [`useComponentMethods()`](./use-component-methods.md)
- [`onMount()`](./on-mount.md)
- [`Root`](./root.md)
