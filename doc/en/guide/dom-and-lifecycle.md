# DOM Access and Lifecycle

`onMount()` registers a callback that runs after the component enters the DOM; use `onCleanup()` when the component is disposed.
Use them for imperative setup (timers, observers, subscriptions) and cleanup.
When you need direct access to a DOM node, pass a ref created by `createRef()` to the `ref` attribute.

## Example: measuring DOM after mount

Use `createRef()` to capture DOM nodes with the `ref` attribute, then measure or wire up libraries in `onMount()`.
Remember to remove listeners in `onCleanup()`.

```tsx
import { createRef, createSignal, onCleanup, onMount } from "kisspa";

function SizeReporter() {
  const boxRef = createRef<HTMLDivElement>();
  const [size, setSize] = createSignal({ width: 0, height: 0 });

  onMount(() => {
    const measure = () => {
      const el = boxRef.value!;
      if (!el) return;
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };

    measure();
    window.addEventListener("resize", measure);
    onCleanup(() => window.removeEventListener("resize", measure));
  });

  return (
    <section>
      <div ref={boxRef} class="panel">Resizable content</div>
      <p>
        Size: {() => size().width} x {() => size().height}
      </p>
    </section>
  );
}
```

`createRef()` assigns the element after mount and clears it on cleanup, so the ref is always safe to read inside lifecycle handlers.

## Component methods for advanced lifecycles

If you need lifecycle hooks inside async code (after `await` or inside a promise callback),
the global `onMount()` and `onCleanup()` are not available there (they cause an error).
`useComponentMethods()` gives you `onMount()` and `onCleanup()` that you can call later.

```tsx
import { useComponentMethods } from "kisspa";

async function ProfileCard(props: { id: () => string }) {
  const { onMount, onCleanup } = useComponentMethods();
  const user = await fetch(`/api/user/${props.id()}`).then((res) => res.json());

  onMount(() => {
    console.log("Mounted with", user.name);
  });

  onCleanup(() => {
    console.log("Disposed");
  });

  return <article>{user.name}</article>;
}
```

Call `useComponentMethods()` synchronously in the component function (before the first `await`).
You can use the returned hooks later in async code, but the hook acquisition itself must be synchronous.

## Related APIs

- [`createRef()`](../api/create-ref.md)
- [`onMount()`](../api/on-mount.md)
- [`onCleanup()`](../api/on-cleanup.md)
- [`useComponentMethods()`](../api/use-component-methods.md)

## Previous / Next

- Previous: [Portals: Portal and PortalDest](./portals.md).
- Next: [Contexts: createContext()](./contexts.md).
