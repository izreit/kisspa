# \<Portal />

Render children into another DOM location without leaving the current component tree.

## Usage

```tsx
<Portal to={target}>{children}</Portal>
```

### Props

|Name|Type|Description|
|:---|:---|:---|
|`to`|`string \| symbol \| Node`|Portal destination. Use a key for a logical target or provide a concrete DOM node.|
|`children`|`PropChildren` (optional)|Content to render at the destination.|

## Description

`<Portal />` splits rendering into two locations. The source component keeps its lifecycle and reactivity, while the children mount inside the destination chosen by `to`.

- When `to` is a `Node`, Kisspa mounts directly into that node.
- When `to` is a `string` or `symbol`, pair the portal with a matching [`<PortalDest from={...} />`](./portal-dest.md) somewhere else in the JSX tree. The destination can appear or disappear dynamically; `<Portal />` shows and hides its children accordingly.

`<Portal />` disposes its children when either the source subtree or the destination goes away, ensuring that [`onCleanup()`](./on-cleanup.md) handlers run.

## Examples

```ts
import { Portal } from "kisspa";

const modals = document.querySelector("#modal-root")!;

function ConfirmDialog(props: { open: () => boolean }) {
  return (
    <Portal to={modals}>
      {() => props.open() ? <div class="modal">Are you sure?</div> : null}
    </Portal>
  );
}
```

## Related

- [`PortalDest`](./portal-dest.md)
