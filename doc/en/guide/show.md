# Conditional Rendering: Show

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

`when` is an accessor that decides which branch renders. `fallback` renders when `when()` is falsy,
so you can keep a loading or empty state close to the main content.

## Capture the condition value

If you want to refer to the `when()` value inside the branch, you have two options:
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

NOTE: Setting `capture` also changes the render condition.
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

## Limitation: use <Show /> instead of if

Kisspa keeps components fast by assuming every component always returns the same JSX shape. Multiple `return`s in `if` or `switch` blocks violate that assumption because the tree differs between renders.

```tsx
// NG (even if `signedIn` is static (non-reactive))
function WelcomeMessage(props: { signedIn: boolean }) {
  if (props.signedIn) {
    return <p>Welcome back!</p>;
  }

  return <button>Sign in</button>;
}
```

The above component returns different roots depending on `signedIn`, so Kisspa cannot reuse the cached structure.
Instead, keep a single `return` and branch inside JSX with `<Show />` (or `<Switch />`).

```tsx
import { Show } from "kisspa";

// OK
function WelcomeMessage(props: { signedIn: boolean }) {
  return (
    <Show when={() => props.signedIn} fallback={<button>Sign in</button>}>
      <p>Welcome back!</p>
    </Show>
  );
}
```

## Related APIs

- [`<Show />`](../api/show.md)
- [`<Switch />`](../api/switch.md)

## Previous / Next

- Previous: [Reactive Component Utilities](./reactive-component.md).
- Next: [Conditional Rendering: Switch and Match](./switch.md).
