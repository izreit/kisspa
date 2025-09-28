# useComponentMethods()

Access lifecycle hooks (`onMount`, `onCleanup`) for the component.

## Syntax

```ts
const { onMount, onCleanup } = useComponentMethods();
```

### Parameters

None.

### Return value

|Name|Type|Description|
|:---:|:---:|:---|
|`onMount`|`(handler: () => void) => void`|Queue a callback to run after the component first mounts and its suspense work settles.|
|`onCleanup`|`(handler: () => void) => void`|Queue a callback that runs when the component is disposed.|

## Description

`useComponentMethods()` is available inside components.

Handlers registered with `onMount` run exactly once after the component enters the DOM (and after any surrounding [`Suspense`](./suspense.md) resolves).
Handlers registered with `onCleanup` run when the component is disposed,
The latter run only if the component mounted successfully, ensuring that pending mounts do not trigger stale cleanup.

The hook works even in async components: you may await before calling `onMount`/`onCleanup`, as long as the calls happen before the component returns its JSX.
But `useComponentMethods()` itself must be called syncronously (i.e. before any `await` in an async component).

Nested registrations are allowed: callbacks added from within an `onMount` handler run later in the same phase.

## Examples

```ts
import { useComponentMethods } from "kisspa";

function Tooltip(props: { target: () => HTMLElement | null }) {
  const { onMount, onCleanup } = useComponentMethods();
  let tooltipEl: HTMLDivElement;

  onMount(() => {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "tooltip";
    tooltipEl.textContent = "Copied!";
    props.target()?.appendChild(tooltipEl);
  });

  onCleanup(() => tooltipEl?.remove());

  return null;
}
```

## Related

- [`onMount()`](./on-mount.md)
- [`onCleanup()`](./on-cleanup.md)
- [`Suspense`](./suspense.md)
