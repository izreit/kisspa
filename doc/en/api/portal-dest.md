# \<PortalDest />

Declare a logical destination for [`<Portal />`](./portal.md) components that target a string or symbol key.

## Usage

```tsx
<PortalDest from={key} />
```

### Props

|Name|Type|Description|
|:---|:---|:---|
|`from`|`string \| symbol`|Shared identifier that matches the `to` prop of `<Portal />`.|

## Description

`<PortalDest />` creates and manages a backing location that portals can attach to. Multiple portals with the same key render sequentially inside the destination.
When the destination is unmounted (for example, hidden by [`<Show />`](./show.md)), connected portals automatically dispose their content until the destination reappears.

Destinations live per key. You can render `<PortalDest />` in one part of the tree and use `<Portal to={key}>` in a distant branch, keeping layout concerns separate from component ownership.

## Examples

```ts
import { Portal, PortalDest } from "kisspa";
const TOAST_KEY = Symbol("toast");

function ToastHost() {
  return <PortalDest from={TOAST_KEY} />;
}

function Trigger() {
  return (
    <Portal to={TOAST_KEY}>
      <div class="toast">Saved!</div>
    </Portal>
  );
}
```

## Related

- [`<Portal />`](./portal.md)
- [`<Show />`](./show.md)
