# Addendum

Additional notes and API references that complement the guide.

## Kisspa Vite plugin

The Vite plugin adds Kisspa component refresh support during HMR.
It is optional and only needed if you want hot module replacement while developing.

Usage:

```ts
import { defineConfig } from "vite";
import kisspa from "kisspa/supplement/vite-plugin";

export default defineConfig({
  plugins: [
    // Optional: only needed for HMR.
    kisspa()
  ]
});
```

LIMITATION: the plugin finds a component from its filename.
This means that (A) only a single component can be enabled HMR per file and
(B) its function name must be inferrable from the filename.
For example, the plugin finds a component named `FooBar` for `foo-bar.tsx` or `foo_bar.tsx`.
For other components HMR are not supported (i.e. replaced with its nearest ancestor component which can be HMR'ed).

This is a limitation to simplify plugin implementation.
Indeed the current plugin is less than 200 LOC TypeScript with zero dependencies.

We don't want to maintain this kind of bundler-specific code but it's bit painful to develop SPA without HMR.

## memoize()

`memoize()` creates a cached computed accessor.
It recomputes when the reactive values inside `compute` change and returns the latest result.

Why it matters:
- Effects re-run when any reactive reads inside them change, which can cause expensive computations to repeat unnecessarily.
- `memoize()` caches the result so the heavy computation runs only when its own dependencies change.

Example:

```ts
import { createStore, createEffect, memoize } from "kisspa";

const [store] = createStore({ name: "john", value: 42 });

const valueIsPrime = () => {
  return ...; // heavy computation
};

const valueIsPrimeMemoized = memoize(valueIsPrime);

createEffect(() => {
  console.log(
    `Hi ${store.name}, ${store.value} is ${valueIsPrimeMemoized() ? "" : "not "}a prime number.`
  );
});
```

In this cae, the effect is re-run `store.name` or `store.value` is changed
but `valueIsPrime()` wrapped by `memoize()` is only re-run after `store.value` is changed.

## presetColors

`presetColors` provides Tailwind-compatible color palettes.
Register them via `$.extend({ colors: presetColors })` to use tokens like `background:sky-500` or `color:neutral-50`.

```ts
import { $ } from "kisspa";
import { presetColors } from "kisspa/extra/preset-colors";

$.extend({ colors: presetColors });
```

The palettes mirror Tailwind CSS v3.4.4. Available color names are:

- slate
- gray
- zinc
- neutral
- stone
- red
- orange
- amber
- yellow
- lime
- green
- emerald
- teal
- cyan
- sky
- blue
- indigo
- violet
- purple
- fuchsia
- pink
- rose

Each color includes 11 steps: 50 (the lightest), 100, 200, 300, 400, 500, 600, 700, 800, 900 and 950 (the darkest).

## Previous / Next

- Previous: [Wrapping up: Build a Todo App](./tutorial-todo.md).
- Index: [Guide Index](./README.md).
