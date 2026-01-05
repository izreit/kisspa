# Kisspa

Kisspa is a lightweight JSX runtime that keeps SPA (Single Page App) simple - fine-grained reactivity, optional utility CSS, and DOM-first APIs without the framework bloat.
With roughly 9 KB of JavaScript (minified + gzip) you still get modern ergonomics such as signals, `<Show />`/`<Switch />`, context, portals, suspense alongside a utility-first CSS generator library.

## Why Kisspa?

- **Tiny & dependency-free** – a single package covers the JSX runtime, renderer, and helper utilities.
- **Fine-grained reactivity** – components automatically re-run only the exact DOM reads that depend on Kisspa’s signal/store primitives, so UI updates stay fast even as components grow.
- **DOM-first mental model** – JSX compiles to direct DOM operations; lifecycle hooks like `onMount()`, context, portals, and `attach()` map closely to the platform.
- **Utility-first CSS included** – You don't need a separate CSS library or bundler-specific support for .css files.

## Getting Started

Read through [`doc/en/guide/README.md`](./doc/en/guide/README.md) for the tutorial path, and see [`doc/en/api/README.md`](./doc/en/api/README.md) for API reference.
