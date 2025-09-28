# attach()

Mount a JSX tree into an existing DOM node.

## Syntax

```ts
attach(node, parent);
attach(node, parent, prev);
```

### Parameters

|Name|Type|Description|
|:---:|:---:|:---|
|`node`|`JSXNode`|Tree to render. Accepts plain values, JSX elements, functions, components, or promises resolved to them.|
|`parent`|`Element`|Container that receives the rendered output.|
|`prev`|`Node \| null`|Optional sibling to insert after. Defaults to the start of `parent`'s children.|

### Return value

|Type|Description|
|:---:|:---|
|[`Root`](./root.md)|Controller for reattaching, flushing suspense work, and dispose.|

## Description

Mount a JSX tree into an existing DOM node.

`attach()` is a wrapper around [`createRoot()`](./create-root.md).
It creates a fresh root bound to `parent`, renders `node`, and returns that root so you can drive later updates.

`attach()` starts rendering immediately but does not wait for asynchronous work.
If you need to wait settlement of async components, promises, or [`Suspense`](./suspense.md) inside JSX, consider to use `createRoot()`.

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
- [`Suspense`](./suspense.md)
