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
|`capture`|`true` (optional)|If true, capture the value from `when` and pass it to `children` (unless the value is neither `false`, `null` nor `undefined`).|
|`children`|`PropChildren` or `(value: () => Exclude<T, boolean>) => PropChildren`|JSX to render when active. With `capture`, receives an accessor for the captured value.|

## Description

`<Switch />` creates a context that coordinates its child `<Match />` components.
Each match registers a predicate, and the switch tracks them reactively.
Whenever conditions change, the first truthy `<Match />` becomes active; previously active matches are disposed, and their cleanup handlers run.
This behavior mirrors `switch`/`case` logic in imperative code while keeping declarative rendering.

You can include a fallback `<Match />` without a `when` prop to handle the default case.

Like `<Show />`, enabling `capture` passes the payload to the child function so you can narrow types.
Without `capture`, TypeScript often cannot narrow the type inside `children`, so you may need an explicit `as` cast.

IMPORTANT NOTE: Also like `<Show />`, enabling `capture` changes the condition of `<Switch />`.
Without `capture`, `children` are shown if the `when()` value is truthy.
With `capture`, they are shown if the `when()` value is neither `false`, `null` nor `undefined`.
Other falsy values (such as `0`, `""`, and `NaN`) are considered "true"-ish if `capture`.
This is a behavior change, not just a typing aid: `capture` can cause branches to match where they otherwise would not.
The rationale is that `capture` is typically used to consume the returned value (including `0` or `""`) in `children`, so the condition is widened to keep those valid values.

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
