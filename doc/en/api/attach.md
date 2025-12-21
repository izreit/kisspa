# attach()

Mount a JSX tree into an existing DOM node.

## Syntax

```ts
attach(node, parent[, prev]);
```

### Parameters

|Name|Type|Description|
|:---|:---|:---|
|`node`|`JSXNode`|Tree to render. Accepts JSX elements, components, or promises resolved to them.|
|`parent`|`Element`|Container that receives the rendered output.|
|`prev`|`Node \| null` (optional)|sibling to insert after. Defaults to the start of `parent`'s children.|

### Return value

A `Root` object: controller for reattaching, flushing suspense work, and dispose.
See [`createRoot()`](./create-root.md) for detail.

## Description

`attach()` is a wrapper around `createRoot()`.
It creates a fresh root bound to `parent`, renders `node`, and returns that root so you can drive later updates.

`attach()` starts rendering immediately but does not wait for asynchronous work.
If you need to wait settlement of async components, promises, or [`<Suspense />`](./suspense.md) inside JSX, use `createRoot()`.

Pass `prev` to control the insertion point within `parent`.
When specified, the rendered output lands immediately after `prev`; otherwise it appears as the first child.

## Examples

```tsx
import { attach, Show } from "kisspa";

const container = document.querySelector("#app")!;
const root = attach(
  <Show when={() => Math.random() > 0.5} fallback={<p>Nope</p>}>
    <p>Hello</p>
  </Show>,
  container
);

// Later on you can wait for async fallbacks and tear everything down.
await root.flush();
root.detach();
```

## Related

- [`createRoot()`](./create-root.md)
- [`Root`](./root.md)
- [`<Suspense />`](./suspense.md)
