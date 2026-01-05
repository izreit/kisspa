# Portals: Portal and PortalDest

`<Portal />` moves its children to another DOM location while keeping lifecycle and reactivity intact.

For example, you can target a DOM element outside the JSX tree, such as a dedicated modal root.

```tsx
import { Portal, Show, createSignal } from "kisspa";

const modalRoot = document.getElementById("modal-root")!;

function App() {
  const [open, setOpen] = createSignal(false);

  return (
    <main>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <Portal to={modalRoot}>
        <Show when={open}>
          <div class="backdrop" onClick={() => setOpen(false)}>
            <div class="modal" onClick={(event) => event.stopPropagation()}>
              <h2>Confirm action</h2>
              <p>Are you sure you want to continue?</p>
              <button onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </Show>
      </Portal>
    </main>
  );
}
```

The modal is mounted under `modalRoot`, but its cleanup still runs when the source subtree is disposed.

## Using PortalDest for JSX locations

If you want to place portal content at another spot inside your JSX tree, use a logical key
and pair `<Portal />` with `<PortalDest />`.

```tsx
import { Portal, PortalDest, Show, createSignal } from "kisspa";

function ModalLayer() {
  return <PortalDest from="modal" />;
}

function ModalPortal(props: { open: () => boolean; onClose: () => void }) {
  return (
    <Portal to="modal">
      <Show when={props.open}>
        <div class="backdrop" onClick={props.onClose}>
          <div class="modal" onClick={(event) => event.stopPropagation()}>
            <h2>Confirm action</h2>
            <p>Are you sure you want to continue?</p>
            <button onClick={props.onClose}>Close</button>
          </div>
        </div>
      </Show>
    </Portal>
  );
}

function App() {
  const [open, setOpen] = createSignal(false);

  return (
    <main>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <ModalLayer />
      <ModalPortal open={open} onClose={() => setOpen(false)} />
    </main>
  );
}
```

The destination can appear or disappear with the rest of the JSX tree, while the portal content
still follows the source component's lifecycle.

The key (`from` and `to`) can be a string or a symbol.
Do not share a key in multiple `<PortalDest />` at the same time.

## Related APIs

- [`<Portal />`](../api/portal.md)
- [`<PortalDest />`](../api/portal-dest.md)

## Previous / Next

- Previous: [Lists: For](./lists.md).
- Next: [DOM Access and Lifecycle](./dom-and-lifecycle.md).
