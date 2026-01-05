# Overview: why Kisspa

Kisspa is a JavaScript UI library for building SPAs,
designed for developers who want the freedom of JSX without the overhead of heavy toolchains.
With **fine-grained reactivity** inspired by Solid, it delivers a responsive and intuitive
programming experience where UI updates are direct, predictable, and efficient.

Unlike typical libraries that rely on complex code transformations, we avoid dedicated bundler plugins or
custom compilers (except optional HMR). If your build system supports TypeScript and modern ESM,
you're ready to go. No extra layers, no hidden dependencies: just a clear path from source to runtime.

Styling often becomes another layer tied to the bundler.
We avoid it by providing **utility-first CSS with zero setup**, thanks to dynamic style generation.
You get the flexibility and consistency of atomic design out of the box.

All of this fits into just **~9kB (minified + gzip)** JavaScript, with no runtime dependencies.
Lightweigth by design, it's easy to learn, easy to ship, and made to stay out of your way.

## First glimpse

If you are already familar with JSX-based library like React, this probably won't feel unnatural.

```tsx
import { attach, createSignal } from "kisspa";

function Counter() {
  const [count, setCount] = createSignal(0);
  return (
    <button type="button" onClick={() => setCount(count() + 1)}>
      Clicked {count} times
    </button>
  );
};

attach(<Counter />, document.getElementById("root")!);
```

## In comparison to other libraries

```text
Don't rely on magic.
```

Not only to avoid original file fromats with unique extensions Kisppa sticks to plain JavaScript sementics: refrain from non-intuitive rules or behaviors unfeasible in ordinary JavaScript.
This belief has led to several characteristics in comparison to other JSX-based libraries.

- **No re-rendering**.
  Component functions are called just once for each instance.
  No need to pretend your components are purely functional.
- **Explicit reactivity**.
  A function is reactive when it's passed to JSX and refers a store.
- **Frictionless async**.
  Your components can be `async` functions in anywhere.
  No special rules or limitationns around `Promise` in components.
  `Promise` can even appear inside JSX.
- **No overridden globals**.
  Nothing are replaced by a framework implicitly.
- **Focus to client-side rendering (CSR)**.
  In exchange for SEO, we obtain clear boundaries between client and server,
  cheaper server cost, simple setup while avoiding server-side vulnerability.

Kisspa doesn't aim to be the fastest, the smallest, or the most scalable library.
It focuses on making small to medium-sized SPAs easy to build with minimal dependencies - not only runtime, but also in build tooling.
In short, Kisspa is built to last in a fast-changing ecosystem with sufficiently small footprint.

## Next

Next: [Getting Started](./getting-started.md).
