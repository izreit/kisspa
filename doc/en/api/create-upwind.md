# createUpwind()

Create a configurable Upwind instance that compiles utility declarations into scoped CSS classes.

This is an **advanced feature**: typically you only need to use `$`, the preconfigured Upwind instance.

## Syntax

```ts
const upwind = createUpwind([target]);
```

### Parameters

|Name|Type|Description|
|:---|:---|:---|
|`target`|`CSSStyleSheet \| undefined` (optional)|destination stylesheet.|

When `target` is omitted, `createUpwind()` creates a `<style>` element, appends it to `document.head`, and uses its sheet.
Pass an explicit target when scripting outside the browser or when you want to control the stylesheet lifecycle yourself.

### Return value

An `Upwind` instance:

- Call it as `upwind(...segments)` to receive `() => string` class factories (see [`$`](./dollar.md) for accepted segment types).
- Invoke `upwind.extend(options)` to register modifiers, property shorthands, colors, aliases, keyframes, a prefix, or a custom numeric formatter.
- Invoke `upwind.add(ruleText)` to inject raw CSS into the managed stylesheet.

## Description

`createUpwind()` is the low-level entry point for Kisspa's utility-first CSS engine.
It wires the parser, caching layer, and stylesheet adapter, returning a callable object that turns succinct declarations into deterministic class names.
Each unique declaration is registered once per instance; repeated calls reuse the cached class name without re-inserting CSS rules.

Use this factory when you need isolated styling scopes, custom breakpoints, or when you want to run Upwind against a specific stylesheet.

### Style targets

The `target` must expose `cssRules` and `insertRule()` (the same surface as `CSSStyleSheet` or other `CSSGroupingRule`). This allows Upwind to nest rules for condition modifiers (`@media`, `@supports`, etc.).

- In browsers, omit `target` to let Upwind manage its own `<style>` tag.
- For testing, pass a mock that implements the same interface.
- With Constructable Stylesheets, pass `new CSSStyleSheet()` and adopt it later.

### extend(options)

`extend()` accepts the following fields (all optional):

|Option|Type|Purpose|
|:---|:---|:---|
|`prefix`|`string`|Prepends a string to every generated class (e.g. `uw_`).|
|`modifiers.conditions`|`{ [name: string]: string }`|Registers condition modifiers that wrap declarations in `@media`, `@supports`, or other at-rules. The value must be the complete at-rule header (e.g. `"@media (prefers-reduced-motion: reduce)"`).|
|`modifiers.selectors`|`{ [name: string]: string \| [string, string] }`|Registers selector modifiers. A string value appends to the selector (e.g. `":is(.dark *)"`); a tuple wraps with `prefix` and `suffix`.|
|`properties`|`{ [alias: string]: string }`|Adds property shorthands. Use `<trbl>` to expand directional variants and `<a|b|c>` to generate multiple keys; corresponding `<>` placeholders are replaced inside expansions.|
|`colors`|`{ [palette: string]: { [tone: string]: string } }`|Defines color palettes. Declarations such as `background:brand-500/75` resolve to the configured color with optional percentage alpha (converted into a hex suffix).|
|`num`|`(value: number) => string`|Custom formatter for numbers that use the `n` suffix (defaults to `n / 4` rem).|
|`aliases`|`{ [name: string]: string }`|Maps bare class names to one or more declarations. Aliases are parsed immediately during `extend()`.|
|`keyframes`|`{ [name: string]: string }`|Registers `@keyframes` rules expressed with the same Upwind syntax (`0%/opacity:0 to/opacity:1`).|

`extend()` can be called multiple times.
Later invocations are merged with previous configuration.

### add(ruleText)

`add()` inserts a raw CSS rule into the underlying stylesheet without parsing.
Use it for one-off global resets or when a declaration cannot be expressed in Upwind syntax.

## Examples

### Custom instance

```tsx
import { createUpwind } from "kisspa";

const upwind = createUpwind();

upwind.extend({
  prefix: "uw_",
  modifiers: {
    conditions: {
      md: "@media (min-width: 768px)",
      dark: "@media (prefers-color-scheme: dark)",
    },
    selectors: {
      hov: [":is(:hover)", ""],
      focus: ":is(:focus-visible)",
    },
  },
  properties: {
    "fs": "font-size",
  },
  colors: {
    brand: {
      500: "#2563eb",
      600: "#1d4ed8",
    },
  },
  num: n => `${n}px`,
  aliases: {
    btn: "d:inline-flex gap:2n fs:1.125rem px:16 py:10 border-radius:9999px",
  },
  keyframes: {
    pulse: "0%/opacity:40% 50%/opacity:100% to/opacity:40%",
  },
});

// Use it in JSX in a component
<button
  class={upwind(
    "btn",
    "background:brand-500 color:white",
    "hov/background:brand-600",
    "md/padding:18n",
    "animation:pulse_2s_ease-in-out_infinite",
  )}
  onClick={...}
>
  Submit
</button>
```

## Related

- [`$()`](./dollar.md)
- [`presetColors`](./preset-colors.md)
