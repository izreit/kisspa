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
Lightweight by design, it's easy to learn, easy to ship, and made to stay out of your way.

## First glimpse

If you are already familiar with a JSX-based library like React, this probably won't feel unnatural.

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

Kisspa sticks to plain JavaScript sementics and refrain from non-intuitive rules or behaviors in ordinary JavaScript.

Kisspa doesn't aim to be the fastest, the smallest, or the most scalable library.
It focuses on making small to medium-sized SPAs easy to build with minimal dependencies - not only runtime, but also in build tooling.
In short, Kisspa is built to last in a fast-changing ecosystem with sufficiently small footprint.

### React

React and Kisspa both expose a JSX-first API and model UI through components with explicit props.

React schedules component re-renders and diffing, so functions must stay pure and hooks coordinate state.
Kisspa runs component bodies once, with fine-grained stores rerunning only the functions that read them, eliminating reconciliation and hook rules.

Modern React guidance also encourages most teams to use frameworks such as Next.js or Remix for routing, data fetching, and performance features.
That makes React deployments depend on those meta-framework conventions like server components, file-based routes, and bundler plugins.
Kisspa instead focuses on small to medium SPAs. It lets you sidestep adopting and maintaining heavyweight frameworks when they add more cost than value.

### Vue

Vue's composition API and Kisspa's stores/effects both rely on reactive proxies.

Vue centers around Single File Components, template compilation, and directive syntax; Kisspa only uses plain JSX/TSX so it slots into any bundler.

### Solid

Solid and Kisspa both embrace fine-grained reactivity, one-time component execution, and JSX ergonomics without a virtual DOM.
A large part of Kisspa's features actually comes from Solid (including components like `<Show />`, `<For />`, and `<Portal />`) while the implementation is independent.

Solid compiles JSX through its bundler plugin to produce optimized DOM instructions and
ships a fuller ecosystem (SSR, streaming, Suspense primitives) that expect the custom compiler, while Kisspa purposefully avoids bespoke tooling.
Kisspa also layers utility-first CSS generation and limits scope to SPAs, trading SSR features for simpler setup and a smaller core surface.

## Next

Next: [Getting Started](./getting-started.md).
