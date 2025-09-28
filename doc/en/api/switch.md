# \<Switch />

Evaluate a set of `<Match />` branches and render the first one that succeeds.

## Usage

```tsx
<Swich>
  <Match when={condition}>
    {children}
  </Match>
  <Match when={condition}>
    {children}
  </Match>
  ...
</Switch>
```

### Props

|Name|Type|Description|
|:---|:---|:---|
|`when`|`() => boolean` or `() => T \| false \| null \| undefined`|Reactive predicate. Omit to create a fallback branch.|
|`capture`|`true` (optional)|Capture the truthy value from `when` and pass it to `children`.|
|`children`|`PropChildren` or `(value: () => Exclude<T, boolean>) => PropChildren`|JSX to render when active. With `capture`, receives an accessor for the captured value.|

## Description

`<Switch />` creates a context that coordinates its child `<Match />` components.
Each match registers a predicate, and the switch tracks them reactively.
Whenever conditions change, the first truthy `<Match />` becomes active; previously active matches are disposed, and their cleanup handlers run.
This behavior mirrors `switch`/`case` logic in imperative code while keeping declarative rendering.

You can include a fallback `<Match />` without a `when` prop to handle the default case.
`<Switch />` works with both boolean conditions and captured values for type narrowing.

Like `<Show />`, enabling `capture` passes the truthy payload to the child function so you can narrow types.

## Examples

```tsx
import { Match, Switch, createSignal } from "kisspa";

const [status, setStatus] = createSignal<"idle" | "pending" | Error>("idle");

<Switch>
  <Match when={() => status() === "idle"}>
    <p>Ready</p>
  </Match>
  <Match when={() => status() === "pending"}>
    <p>Loading...</p>
  </Match>
  <Match capture when={() => status() instanceof Error && status()}>
    {(err) => <p class="error">{() => err().message}</p>}
  </Match>
  <Match>
    <p>Unknown state</p>
  </Match>
</Switch>;
```

## Related

- [`<Show />`](./show.md)
