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
|`capture`|`true` (optional)|Enable capturing of non-boolean truthy values and pass them to `children` as an accessor.|
|`fallback`|`JSXNode` (optional)|Content rendered when `when()` is falsey.|
|`children`|`PropChildren` or `(value: () => Exclude<T, boolean>) => PropChildren`|Content to render when the condition is truthy. When `capture` is set, receives an accessor to the captured value.|

## Description

`<Show />` is a convenience wrapper around the [`<Match />`](./match.md) infrastructure. It evaluates the `when` accessor reactively and mounts the `children` branch when it is truthy. Optionally pass `fallback` to display alternative content when the condition is false.

Setting `capture` to `true` tells `<Show />` to treat the condition as a type guard. The first truthy value returned from `when` is captured and provided to the child function as a getter, enabling refinements (for example, narrowing from `number | string` to `number`).

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
