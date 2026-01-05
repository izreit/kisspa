# \<Show />

Conditionally render content with optional fallbacks and captured values.

## Usage

```tsx
<Show when={condition} fallback={fallback}>
  {children}
</Show>
```

### Props

|Name|Type|Description|
|:---|:---|:---|
|`when`|`() => boolean` (default) or `() => T \| false \| null \| undefined` when `capture`|Reactive condition. With `capture`, it also provides the truthy value.|
|`capture`|`true` (optional)|If true, capture the value from `when` and pass it to `children` (unless the value is neither `false`, `null` nor `undefined`).|
|`fallback`|`JSXNode` (optional)|Content rendered when `when()` is falsey.|
|`children`|`PropChildren` or `(value: () => Exclude<T, boolean>) => PropChildren`|Content to render when the condition is truthy. When `capture` is set, receives an accessor to the captured value.|

## Description

`<Show />` evaluates the `when` accessor reactively and mounts the `children` branch when it is truthy. Optionally pass `fallback` to display alternative content when the condition is false.

Setting `capture` to `true` tells `<Show />` to treat the condition as a type guard. The truthy value returned from `when` is captured and provided to the child function as a getter, enabling refinements (for example, narrowing from `number | string` to `number`).
This also helps TypeScript: without `capture`, you often need an explicit `as` cast inside `children` to access the narrowed type.

IMPORTANT NOTE: setting `capture` changes the condition of `<Show />`.
Without `capture`, `children` are shown if the `when()` value is truthy (i.e. `!!when() === true`).
With `capture`, they are shown if the `when()` value is neither `false`, `null` nor `undefined` (i.e. a more relaxed condition).
Other falsy values (such as `0`, `""`, and `NaN`) are considered "true"-ish if `capture`.
This means `capture` can change which branch renders, so treat it as a semantic switch, not just a typing helper.
The rationale is that `capture` is often used to consume a value (including `0` or `""`) inside `children`, so the condition is widened to avoid losing those valid values.

When hidden, `<Show />` disposes the active branch so that [`onCleanup()`](./on-cleanup.md) handlers run.
If you just want to hide, consider to toggle CSS style like `display: none`.

## Examples

```ts
import { Show } from "kisspa";
import { createSignal } from "kisspa/reactive";

const [user, setUser] = createSignal<{ name: string } | null>(null);

<Show when={() => user()} fallback={<button>Sign in</button>} capture>
  {(u) => <p>Welcome back, {() => u().name}!</p>}
</Show>;

setUser({ name: "Ada" });
```

## Related

- [`<Switch />`](./switch.md)
- [`<Suspense />`](./suspense.md)
