# Getting Started

This guide walks you through wiring Kisspa into a small Vite setup and rendering a tiny counter component.

## Prerequisites

You need Node.js with npm, and a fresh Vite project (or any ESM-based toolchain).

## 1) Install

Install the package into your project.

```bash
npm i kisspa
```

This adds Kisspa to your project dependencies.

## 2) Configure TypeScript

Tell TypeScript to compile JSX against Kisspa's runtime. JSX is a syntax that lets you write HTML-like tags in JavaScript; the compiler turns those tags into Kisspa runtime calls.

`tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "moduleResolution": "bundler",
    "lib": ["DOM", "ES2020"],
    "jsx": "react-jsx",
    "jsxImportSource": "kisspa"
  }
}
```

## 3) Configure Vite

Match Vite's JSX runtime to the same setting so both compilers agree.
Optionally, add the Kisspa Vite plugin (from `kisspa/supplement/vite-plugin`) for HMR support.

`vite.config.ts`
```ts
import { defineConfig } from "vite";
import kisspa from "kisspa/supplement/vite-plugin";

export default defineConfig({
  plugins: [
    // Optional: only needed for HMR.
    kisspa()
  ],
  esbuild: {
    jsxImportSource: "kisspa"
  }
});
```

This keeps Vite's JSX transform aligned with TypeScript so the runtime matches.
The plugin provides simplified HMR support. See [Addendum][addendum] for detail.

[addendum]: ../guide/addendum.md

## 4) Hello world

Create a root element and point Vite at your entry file.

`index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kisspa App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

The `<div id="app"></div>` element is the mount target for `attach()`.

Now add a component that shows a counter and mounts it into the page. A component is a function that returns JSX.

`main.tsx`

```tsx
import { attach, createSignal } from "kisspa";

function App() {
  // Reactive counter signal and its setter.
  const [count, setCount] = createSignal(0);

  return (
    <main>
      <h1>Hello Kisspa</h1>
      <button
        onClick={() => {
          setCount(count() + 1);
        }}
      >
        Count: {count}
      </button>
    </main>
  );
}

attach(<App />, document.getElementById("app")!);
```

Clicking the button increments the signal and the text updates because the JSX reads the signal getter directly.

## Gotcha: JSX runtime must match

If `jsxImportSource` is missing or mismatched between TypeScript and Vite, JSX compiles to the wrong runtime and nothing renders.

## Previous / Next

- Previous: [Why Kisspa — Make SPA Simple Again](./why-kisspa.md).
- Next: [Components and JSX Primitives](./components.md).
