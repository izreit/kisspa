# Styling with Upwind

Kisspa ships with Upwind, a utility-first CSS library that compiles small declarations into classes.
Utility-first CSS means you compose styles from tiny, single-purpose utilities instead of writing large bespoke selectors.

Unlike Tailwind (a well-known utility-first CSS library), the syntax stays close to neutral CSS (`property:value`)
so you can reuse familiar CSS knowledge and keep the intent readable without memorizing a large custom DSL.

## $()

`$()` compiles utility-like declarations into class names.
It returns a function, so pass it directly to `class` attribute of DOM elements.

Each string argument is a list of `property:value` declarations separated by spaces.
Use `_` to represent spaces inside values, and prefix modifiers with `/` for responsive or state variants.
For example: `"margin:1rem color:red"`, `"flex-flow:row_nowrap"`, and `"sm/padding:3n :hover/color:#fff"`.
You can also include plain class names (no `:`) alongside generated utilities.

`$()` supports several shorthand properties like `d` for `display`, `px` for `padding-left`/`padding-right`,
and `bg` for `background`. It also supports the `n` unit, which expands numbers by `n / 4 rem`
(for example, `2n` becomes `0.5rem`) so that `px-2` in Tailwind can be written as `px:2n`.
See the full default shorthand list in the [$() API reference](../api/dollar.md).

```tsx
import { $ } from "kisspa";

function PrimaryButton() {
  const buttonClass = $(
    "d:inline-flex align-items:center gap:2n px:4n py:2n",
    "border-radius:9999px background:#1d4ed8 color:white"
  );

  return <button class={buttonClass}>Save</button>;
}
```

Each string is a set of declarations; `$()` combines them into a single class list accessor.

## Dynamic styles with functions

Pass functions to generate declarations from reactive state.
The functions can read signals or stores (for example, `active()` below) to compute the current values.

```ts
$(
  "d:inline-flex px:4n py:2n border-radius:9999px",
  () => `background:${active() ? "#0f172a" : "#f97316"}`,
  () => `color:${active() ? "#f8fafc" : "#0f172a"}`
)
```

## Pseudo selectors

Use modifier prefixes like `:hover` and `:active` to scope a declaration.

```ts
$(
  "bg:#1d4ed8 color:white",
  ":hover/background:#1e40af",
  ":active/transform:scale(0.98)"
)
```

## Grouping with { }

Wrap multiple declarations for a modifier using `/{` and `}`.

```ts
$(":hover/{background:#111 color:#fff border-color:#111}")
```

## Breakpoints and combinations

Use responsive modifiers like `sm`, `md`, or `lg`, and combine them with pseudo selectors.

```ts
$(
  "px:3n py:2n",
  "sm/px:4n lg/px:6n",
  "lg/:hover/transform:translateY(-1px)"
)
```

For full syntax details, see the [$() API reference](../api/dollar.md).

## Advanced: customize with createUpwind()

Use `createUpwind()` when you need custom breakpoints, color palettes, or aliases.
The default `$()` instance already includes common breakpoints and shorthand properties.

## Gotcha: $() returns an accessor

`$()` returns `() => string`, so pass it to `class` prop in JSX, not `className` of DOM elements or a plain string.
If you need a static class, call the accessor once or combine it with static class names.

## Related APIs

- [`$()`](../api/dollar.md)
- [`createUpwind()`](../api/create-upwind.md)
- [`presetColors`](../api/preset-colors.md)

## Previous / Next

- Previous: [Dynamic Components: Dynamic](./dynamic.md).
- Next: [Wrapping up: Build a Todo App](./tutorial-todo.md).
