# Reactive Components: Props and Children

When you build reusable components, aim to keep them reactive without forcing every caller to use signals or stores.
Kisspa provides helper types and utilities to accept both dynamic accessors and static values.

## Accept reactive props (and static values)

For reactive behavior, a prop should accept a function that returns the value to display.
At the same time, it should also accept a plain value so callers can pass static data.

Use the `Prop<T>` type to allow both.

```tsx
import { deprop, type Prop } from "kisspa";

type PriceTagProps = {
  label: Prop<string>;
  amount: Prop<number>;
};

function PriceTag(props: PriceTagProps) {
  const label = () => deprop(props.label);
  const amount = () => deprop(props.amount).toFixed(2);

  return (
    <p>
      {label()}: ${amount()}
    </p>
  );
}

<PriceTag label="Total" amount={19.5} />;
<PriceTag label={() => `Total (${currency()})`} amount={() => total()} />;
```

`Prop<T>` lets callers pass either `T` or `() => T`.
`deprop()` unwraps the value by calling the function or returning the literal.
Call `deprop()` inside reactive accessors or JSX so changes propagate correctly.

## Children props and PropChildren

Components can accept JSX children, as well as strings and numbers (they are valid JSX nodes).
Use `PropChildren` to type the `children` prop.

```tsx
import type { PropChildren } from "kisspa";

function Card(props: { title: string; children?: PropChildren }) {
  return (
    <section>
      <h2>{props.title}</h2>
      <div class="body">{props.children}</div>
    </section>
  );
}

<Card title="Notes">3 updates</Card>;
<Card title="Count">{count()}</Card>;
```

## Gotcha: read Prop<T> values reactively

If you call `deprop()` outside JSX or a reactive accessor, updates will not be tracked.
Keep the read inside a function or JSX expression so Kisspa can observe it.

## Related APIs

- [`Prop<T>`](../api/prop.md)
- [`deprop()`](../api/deprop.md)
- [`PropChildren`](../api/prop-children.md)

## Previous / Next

- Previous: [Reactivity Basics: Store and functions](./reactivity.md).
- Next: [Conditional Rendering: Show](./show.md).
