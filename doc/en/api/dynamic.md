# \<Dynamic />

Render a component chosen at runtime with reactive props.

## Usage

```tsx
<Dynamic component={componentAccessor} props={propsAccessor} />
```

### Props

|Name|Type|Description|
|:---|:---|:---|
|`component`|`() => Component<T>`|Accessor that returns the component to render.|
|`props`|`() => T`|Accessor that produces the props object passed to the selected component.|

## Description

`<Dynamic />` wraps its internals in a reactive effect.
Whenever either accessor changes, Kisspa reassembles the child component with the new inputs.
This makes it ideal for routing, feature switches, or component registries where the concrete implementation varies over time.

`<Dynamic />` preserves the subtree's lifecycle: the previously rendered component is disposed (running its [`onCleanup()`](./on-cleanup.md) handlers) before the replacement mounts.

## Examples

```tsx
import { Dynamic, createSignal } from "kisspa";

const [mode, setMode] = createSignal<"a" | "b">("a");

function ViewA(props: { count: number }) {
  return <div>A {() => props.count}</div>;
}

function ViewB(props: { count: number }) {
  return <div>B {() => props.count * 10}</div>;
}

<Dynamic
  component={() => (mode() === "a" ? ViewA : ViewB)}
  props={() => ({ count: 1 })}
/>;

setMode("b");
```

## Related

- [`<For />`](./for.md)
- [`<Show />`](./show.md)
- [`<Switch />`](./switch.md)
