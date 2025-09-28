# <Suspense />

Coordinate async rendering by showing fallback content until all tracked promises settle.

## Usage

```tsx
<Suspense fallback={fallback} errorFallback={error}>
  {children}
</Suspense>
```

### Props

|Name|Type|Description|
|:---:|:---:|:---|
|`fallback`|`JSXNode` (optional)|Content displayed while pending promises resolve.|
|`errorFallback`|`JSXNode \| ((error: unknown, reset: () => void) => JSXNode)` (optional)|Content shown when a child throws/rejects. Function form receives the error and a `reset` callback to retry.|
|`children`|`PropChildren` (optional)|Async-aware content. It may include promises or async components.|

## Description

`<Suspense />` tracks promises encountered during evaluating its children.
While any promise is pending, it renders the `fallback` content once.
When everything resolves, it replaces the fallback with the real children.

If a promise rejects or a synchronous error bubbles out, `<Suspense />` displays `errorFallback` (when provided) and swallows the error so the rest of the tree stays mounted.
Invoking the `reset` callback from an error fallback clears the failure and reattempts rendering.

`<Suspense />` integrates with root-level flow: awaiting `root.flush()` waits for all parent suspense contexts to settle. Cleanup of children occurs automatically when the fallback or error branch is replaced.

## Examples

```ts
import { Suspense } from "kisspa";

function UserCard(props: { id: () => string }) {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      {fetch(`/api/user/${props.id()}`).then((res) => res.json()).then((user) => (
        <article>{user.name}</article>
      ))}
    </Suspense>
  );
}
```

## Related

- [`createRoot()`](./create-root.md)
