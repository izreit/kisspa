# Prop<T>

Utility type that accepts either a literal value or a getter function returning that value.

## Definition

```ts
type Prop<T> = T | (() => T); // for non-function type T 
```

Represents a prop value that may be static (`T`) or derived from a zero-argument function returning `T`.

## Description

`Prop<T>` simplifies typing for components that accept both static and reactive inputs.
When you annotate a prop with `Prop<T>`, callers can pass either a value of type `T` or a function that returns `T`. 
Functions are disallowed if `T` itself is already callable, preventing ambiguous signatures such as `Prop<() => void>`.

Use [`deprop()`](./deprop.md) to unwrap a `Prop<T>` when you need the underlying value.

## Examples

```ts
import type { Prop } from "kisspa";

interface ButtonProps {
  label: Prop<string>;
}

function Button(props: ButtonProps) {
  return <button>{props.label}</button>;
}

<Button label="Save" />;
<Button label={() => `Save ${new Date().toLocaleTimeString()}`} />;
```

## Related

- [`deprop()`](./deprop.md)
- [`PropChildren`](./prop-children.md)
