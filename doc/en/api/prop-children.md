# PropChildren

Common prop type for components that accept JSX children.

## Definition

```ts
type PropChildren = JSXNode | JSXNode[] | null | undefined;
```

## Description

`PropChildren` represents values allowed in a component’s `children` prop: a single [`JSXNode`](./jsx-node.md), an array of nodes, or an omitted value.

## Examples

```ts
import type { PropChildren } from "kisspa";

function Card(props: { title: string; children?: PropChildren }) {
  return (
    <section>
      <h2>{props.title}</h2>
      <div class="body">{props.children}</div>
    </section>
  );
}

<Card title="Docs">Read me</Card>;
<Card title="Async">{Promise.resolve("done")}</Card>;
```

## Related

- [`JSXNode`](./jsx-node.md)
