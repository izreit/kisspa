# $()

Compile Upwind declarations into CSS classes with the preset breakpoints and shorthands.

Kisspa's utility-first CSS library core.

## Syntax

```ts
$(...declarations)
```

Examples: 

```ts
// Basic styling with whitespace-separated CSS declarations
$("margin:1rem color:red font-size:0.5rem")

// Whitespace in CSS value should be denoted by "_"
$("flex-flow:row_nowrap")

// Can be splitted into multiple arguments (to keep shorter line length)
$(
  "d:flex flex-flow:row_nowrap flex:1_0_auto gap:2n",
  "margin:10px padding-left:1em",
)

// Pseudo selector like :hover and :active can be prefixed with "/"
$(":hover/font-weight:bold")
// and grouped with "/{" and "}"
$(":hover/{font-weight:bold color:#ff0ff}");

// Predefined breakpoints such as `sm`, `md` and `lg` (like Tailwind.css)
// are available for responsive designs
$("sm/{font-weight:bold color:#ff0ff}");

// Functions for dynamic styling, or objects if you want
$(
  "margin:10px padding-left:1em",
  () => `background:${isActive() ? "white" : "gray"}`,
  ":hover": {
    "margin-bottom": "1px",
    color: () => "#1f2937"
  }
)
```

### Arguments

Any number of the following:

- A string: Whitespace-separated declarations such as `background:red` or `:hover/color:#fff`. Plain class names without `:` are passed through unchanged.
- An object: Nested object form that mirrors CSS properties and selector/modifier blocks.
- A function returning string or object (`() => string | object`), to 

### Return value

A function `() => string` that yields the generated class list.
Can be passed to `class` attribute of JSX.

```tsx
<button class={$("padding:1rem background:red")}>
  Submit
</button>
```

## Description

`$` is a pre-configured Upwind instance.
It parses utility-like declarations, registers the necessary CSS rules once, and returns stable class names you can attach to elements.
Repeated uses of the same declaration reuse the cached rule instead of inserting duplicates.

### Strings, modifiers, and values

- Write declarations as `property:value`. Use `_` to spell spaces, or quote segments when needed (`font:"Open Sans"`).
- Prefix a declaration with modifiers separated by `/`, e.g. `:hover/color:#fff` or `sm/background:#0f172a`.
- Target related elements with `_` suffixes: `:hover_group~/background:yellow` applies when a sibling with class `group` is hovered.
- Declarations without `:` (e.g. `flex` or `btn`) are returned verbatim so you can mix authored class names with generated ones.

### Object form and grouping

Pass plain objects to group declarations, nest modifiers, or spread reusable fragments:

```ts
$({
  background: "#fff",
  boxShadow: "0 8px 32px rgba(15, 23, 42, 0.08)",
  borderRadius: "1rem",
  sm: {
    padding: "6n",
    ":hover": {
      transform: "translateY(-1n)",
    },
  },
});
```

Each key is parsed using the same rules as string declarations; nested objects inherit modifiers from their parent key.

### Dynamic segments

Provide functions when a portion should respond to reactive state:

```ts
$(
  "d:inline-flex px:3n py:1n border-radius:9999px",
  () => `background:${theme().chipBg}`,
  { color: () => theme().chipText },
);
```

### Built-in configuration

The exported instance already calls `$.extend()` with:

- Breakpoint modifiers: `sm`, `md`, `lg`, `xl`, `2xl` mapped to `@media (min-width: 640|768|1024|1280|1536px)`.
- Number shorthand: values that end with `n` expand via `n => n / 4 rem` (for example, `2n` → `0.5rem`).
- Property shorthands (see the following)

|Shorthand|Treated as|Example|
|:---|:---|:---|
|`d`|`display`|`d:flex`|
|`bg`|`background`|`bg:red`|
|`w`|`width`|`w:100px`|
|`max-w`|`max-width`|`max-w:200px`|
|`min-w`|`min-width`|`min-w:10px`|
|`h`|`height`|`h:100px`|
|`max-h`|`max-height`|`max-h:200px`|
|`min-h`|`min-height`|`min-h:10px`|
|`mt`|`margin-top`|`mt:2n`|
|`mr`|`margin-right`|`mr:10px`|
|`mb`|`margin-bottom`|`mb:1rem`|
|`ml`|`margin-left`|`ml:3n`|
|`mx`|`margin-left` and `margin-right`|`mx:3em`|
|`my`|`margin-top` and `margin-bottom`|`my:0.5n`|
|`pt`|`padding-top`|`pt:2n`|
|`pr`|`padding-right`|`pr:10px`|
|`pb`|`padding-bottom`|`pb:1rem`|
|`pl`|`padding-left`|`pl:3n`|
|`px`|`padding-left` and `padding-right`|`px:3em`|
|`py`|`padding-top` and `padding-bottom`|`py:0.5n`|
|`bt`|`border-top`|`bt:2n`|
|`br`|`border-right`|`br:10px`|
|`bb`|`border-bottom`|`bb:1rem`|
|`bl`|`border-left`|`bl:3n`|
|`bx`|`border-left` and `border-right`|`bx:3em`|
|`by`|`border-top` and `border-bottom`|`by:0.5n`|

Use `$.extend()` to add more modifiers, shorthands, colors, aliases, or keyframes. See [`createUpwind()`](./create-upwind.md) for the full option set.

## Examples

### Basic CSS declarations

```tsx
<span class={$("background:#111 color:white padding:0.5rem border-radius:9999px")}>New</span>
```

### Property shorthands and numeric units

```ts
$("d:flex flex-direction:column gap:3n px:4n py:2n")
// d:flex → display:flex
// gap:3n → gap: 0.75rem
// px:4n → padding-left/right: 1rem
// py:2n → padding-top/bottom: 0.5rem
```

### Modifiers and pseudo-selectors

```ts
$(
  "bg:#1d4ed8 color:white font-weight:600",
  ":hover/background:#1e40af",
  "sm/padding:3n md/padding:4n",
)
```

## Related

- [`createUpwind()`](./create-upwind.md)
