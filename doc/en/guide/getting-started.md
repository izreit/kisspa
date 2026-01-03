# Getting Started

This guide walks you through wiring Kisspa into a small Vite setup and rendering a tiny counter component.

## 1) Initialize

Create the project folder and install the package into your project.

```bash
mkdir kisspa-demo
cd kisspa-demo
npm init -y
npm install kisspa
npm install -D typescript vite
```

`npm init -y` writes a bare package manifest.
Kisspa ships ESM modules, so the default TypeScript + Vite toolchain works without extra plugins.

## 2) Define scripts in `package.json`

Edit the generated `package.json` so Vite can power the dev server and build step.
Add `"scripts"` properties and set `"type"` as following.

```jsonc
{
  // ...
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  // ...
}
```

## 3) Configure TypeScript

Create `tsconfig.json` with Kisspa’s JSX runtime settings.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "moduleResolution": "bundler",
    "lib": ["DOM", "ES2020"],
    "jsx": "react-jsx",
    "jsxImportSource": "kisspa",
    "strict": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

Tell TypeScript to compile JSX against Kisspa's runtime. JSX is a syntax that lets you write HTML-like tags in JavaScript; the compiler turns those tags into Kisspa runtime calls.

`jsxImportSource` points TypeScript at Kisspa’s JSX helpers. Vite uses the same option next.

## 4) Configure Vite

Create `vite.config.ts` in the project root.

```ts
import { defineConfig } from "vite";
import kisspa from "kisspa/supplement/vite-plugin";

export default defineConfig({
  plugins: [
    kisspa() // Optional: only needed for HMR.
  ],
  esbuild: {
    jsxImportSource: "kisspa"
  }
});
```

Match Vite's JSX runtime to the same setting so both compilers agree.
This keeps Vite's JSX transform aligned with TypeScript so the runtime matches.

Optionally, add the Kisspa Vite plugin (from `kisspa/supplement/vite-plugin`) for HMR support.
The plugin provides simplified HMR support. See [Addendum][addendum] for detail.

[addendum]: ../guide/addendum.md

## 5) Hello world

Create `src/main.tsx` and mount your first component.

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

Add finally a minimal `index.html` next to `vite.config.ts`:

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
    <script type="module" src="src/main.tsx"></script>
  </body>
</html>
```

The `<div id="app"></div>` element is the mount target for `attach()`.

## 6) Run the project

```bash
npm run dev -- --open
```

Clicking the button increments the signal and the text updates because the JSX reads the signal getter directly.

## Previous / Next

- Previous: [Overview: why Kisspa](./why-kisspa.md).
- Next: [Components and JSX](./components.md).
