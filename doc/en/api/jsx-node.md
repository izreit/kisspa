# JSXNode

Union type that covers every value Kisspa’s renderer accepts as JSX.

## Definition

```ts
type JSXNode =
  | undefined | null | string | number
  | JSXElement
  | (() => JSXNode)
  | Promise<undefined | null | string | number | JSXElement | (() => JSXNode)>;
```

Represents values that can appear as JSX children, component results, or promise resolutions.

## Description

`JSXNode` is the canonical value space for Kisspa’s JSX runtime.

Use it as the return type of (synchronous) components.
For async components, use `Promise<JSXNode>` or `JSXNodeAsync`.

## Related

- [`PropChildren`](./prop-children.md)
- [`Suspense`](./suspense.md)
- [`Show`](./show.md)
