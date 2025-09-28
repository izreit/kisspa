# createRoot()

Create a reusable root controller that manages a JSX tree inside a specific DOM container.

## Syntax

```ts
const root = createRoot(parent[, prev]);
```

### Parameters

|Name|Type|Description|
|:---|:---|:---|
|`parent`|`Element`|DOM element that hosts the rendered tree.|
|`prev`|`Node \| null`|Optional sibling to insert after. Defaults to the first child position.|

### Return value

A `Root` object which has the following definition:

```ts
interface Root {
  attach(node: JSXNode): Promise<unknown>;
  detach(): void;
  flush(): Promise<void>;
}
```

## Description

`createRoot()` sets up the machinery that renders JSX into `parent`.
The returned `Root` lets you attach new trees, dispose the current tree, and await active suspense work.
The root tracks a dedicated suspense context so that `root.flush()` resolves when the current async work (triggered by components or promises) finishes.

Calling `root.attach(node)` replaces any previously mounted content and resolves once the subtree is fully mounted, including nested [`<Suspense />`](./suspense.md) blocks.

`root.detach()` stops tracking the tree, runs accumulated cleanup handlers, and frees refs.

Pass `prev` when you need to mount relative to an existing sibling (for example, inserting between DOM nodes you do not control).
Subsequent `root.attach()` calls continue to honor that insertion point.

## Examples

```ts
import { createRoot, Suspense } from "kisspa";

const outlet = document.querySelector("#outlet")!;
const root = createRoot(outlet);

await root.attach(
  <Suspense fallback={<p>Loading…</p>}>
    <AsyncProfile userId="u42" />
  </Suspense>
);

// Display a different view later.
await root.attach(<Settings />);

// Ensure all async side-effects have flushed before tearing down.
await root.flush();
root.detach();
```

## Related

- [`attach()`](./attach.md)
- [`<Suspense />`](./suspense.md)
