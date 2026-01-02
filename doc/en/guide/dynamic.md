# Dynamic Components: Dynamic

`<Dynamic />` lets you choose which component to render based on reactive state.
Both `component` and `props` are accessors, so updates are tracked automatically.

```tsx
import { Dynamic, createSignal } from "kisspa";

type ViewProps = { count: () => number };

function CompactView(props: ViewProps) {
  return <p>Compact: {props.count}</p>;
}

function DetailedView(props: ViewProps) {
  return <p>Detailed count: {props.count}</p>;
}

const registry = {
  compact: CompactView,
  detailed: DetailedView
};

type ViewKey = keyof typeof registry;

function ViewSwitcher() {
  const [mode, setMode] = createSignal<ViewKey>("compact");
  const [count, setCount] = createSignal(1);

  return (
    <section>
      <button onClick={() => setMode("compact")}>Compact</button>
      <button onClick={() => setMode("detailed")}>Detailed</button>
      <button onClick={() => setCount(count() + 1)}>+</button>

      <Dynamic
        component={() => registry[mode()]}
        props={() => ({ count })}
      />
    </section>
  );
}
```

When `mode()` changes, the previous view is disposed and the new one mounts with the latest props.

## Gotcha: pass accessors, not values

Both `component` and `props` must be functions.
If you pass the component directly, `<Dynamic />` cannot react to changes.

## Related APIs

- [`<Dynamic />`](../api/dynamic.md)
- [`<Show />`](../api/show.md)

## Previous / Next

- Previous: [Async Components: Suspense and Promise](./async.md).
- Next: [Styling with Upwind](./styling.md).
