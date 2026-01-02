# Conditional Rendering: Switch and Match

`<Switch />` renders the first matching `<Match />` and disposes the rest.
Use a final `<Match>` without a `when` prop as the default case.

```tsx
import { Match, Switch, createSignal } from "kisspa";

const [status, setStatus] = createSignal<
  "idle" | "loading" | "success" | "error"
>("idle");

function StatusPanel() {
  return (
    <Switch>
      <Match when={() => status() === "idle"}>
        <p>Ready to start.</p>
      </Match>
      <Match when={() => status() === "loading"}>
        <p>Loading...</p>
      </Match>
      <Match when={() => status() === "success"}>
        <p>Done.</p>
      </Match>
      <Match>
        <p>Something went wrong.</p>
      </Match>
    </Switch>
  );
}
```

Each `when` accessor decides whether its branch is active. The first truthy match renders,
and the rest stay unmounted until their conditions become true.

## Capture in Match

`<Match capture>` follows the same rules as `<Show />` (see [Show](./show.md) for details).
With `capture`, the return value of `when()` is exposed to the children as an accessor 
if it's neither `false`, `null`, nor `undefined`.

```tsx
import { Match, Switch, createSignal } from "kisspa";

const [result, setResult] = createSignal<Error | null>(null);

<Switch>
  <Match when={() => !result()}>
    <p>All good.</p>
  </Match>
  <Match capture when={() => result()}>
    {(err) => <p>Error: {() => err().message}</p>}
  </Match>
</Switch>;
```

NOTE Setting `capture` also changes the render condition.
Without `capture`, `children` render when `when()` is truthy.
With `capture`, they render when `when()` is neither `false`, `null`, nor `undefined`, so `0`, `""`, or `NaN` still match.
This is a behavior change, not just a typing aid, so treat `capture` as a semantic switch.
The rationale is that `capture` is typically used to consume the value in `children`, and
values like `0` or `""` are meaningful even though they are falsy.

Without `capture`, TypeScript often cannot narrow the type inside `children`, so you may
need an explicit `as` cast to access properties.

## Gotcha: conditions must be reactive accessors

`when` should be a function, not a pre-evaluated boolean.
If you pass `when={status() === "loading"}`, it only evaluates once and never updates.

## Related APIs

- [`<Switch />`](../api/switch.md)
- [`<Show />`](../api/show.md)

## Previous / Next

- Previous: [Conditional Rendering: Show](./show.md).
- Next: [Lists: For](./lists.md).
