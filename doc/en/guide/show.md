# Conditional Rendering: Show

## Show for simple branches

Use `<Show />` when you need a single conditional branch and an optional fallback.

```tsx
import { Show, createSignal } from "kisspa";

const [loading, setLoading] = createSignal(false);

function SubmitButton() {
  return (
    <Show when={() => !loading()} fallback={<span>Sending...</span>}>
      <button onClick={() => setLoading(true)}>Submit</button>
    </Show>
  );
}
```

`when` is an accessor that decides which branch renders. `fallback` renders when `when()` is falsey,
so you can keep a loading or empty state close to the main content.

## Capture the condition value

If you want to refer the `when()` value inside the branch, you have two options:
read it from the original signal/store, or enable `capture`.

With `capture`, the return value of `when()` is passed to the child function as an accessor 
when it's neither `false`, `null`, nor `undefined`.

```tsx
import { Show, createSignal } from "kisspa";

const [user, setUser] = createSignal<{ name: string } | null>(null);

function Header() {
  return (
    <header>
      <Show
        when={() => user()}
        fallback={
          <button onClick={() => setUser({ name: "Ada" })}>Sign in</button>
        }
        capture
      >
        {(u) => <p>Welcome, {() => u().name}</p>}
      </Show>
    </header>
  );
}
```

NOTE Setting `capture` also changes the render condition.
Without `capture`, `children` render when `when()` is truthy (i.e. `!!when() === true`).
With `capture`, they render when `when()` is neither `false`, `null`, nor `undefined` (i.e. a more relaxed condition),
so values like `0`, `""`, or `NaN` still render and are available in the child.
This is a behavior change, not just a typing helper, so treat `capture` as a semantic switch.
The rationale is that `capture` is typically used to consume the value in `children`, and
values like `0` or `""` are meaningful even though they are falsy.

The `capture` option also helps TypeScript: without `capture`, you often need an explicit `as` cast inside
`children` to access the narrowed type.

## Gotcha: conditions must be reactive accessors

`when` should be a function, not a pre-evaluated boolean.
If you pass `when={loading()}`, it only evaluates once and never updates.

## Related APIs

- [`<Show />`](../api/show.md)
- [`<Switch />`](../api/switch.md)

## Previous / Next

- Previous: [Reactive Components: Props and Children](./reactive-component.md).
- Next: [Conditional Rendering: Switch and Match](./switch.md).
