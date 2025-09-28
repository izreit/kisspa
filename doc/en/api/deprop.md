# deprop()

Unwrap a [`Prop<T>`](./prop.md) by returning its value or invoking its getter.

## Syntax

```ts
const value = deprop(prop);
```

### Parameters

|Name|Type|Description|
|:---|:---|:---|
|`prop`|`Prop<T>`|Prop value to unwrap. May be `null`/`undefined`.|

### Return value

Underlying value of the prop. Functions are invoked, other values are returned as-is.

## Description

`deprop()` inspects the supplied prop and, if it is a function, calls it to obtain the concrete value.
Use it inside components that accept [`Prop<T>`](./prop.md) inputs when you need the immediate value.

The helper tolerates `null`-ish inputs, forwarding them unchanged.
This matches how component props may omit optional values.

## Examples

```ts
import { deprop, type Prop } from "kisspa";

function Price(props: { amount: Prop<number> }) {
  const cents = () => Math.round(deprop(props.amount) * 100);
  return <span>${() => (cents() / 100).toFixed(2)}</span>;
}
```

## Related

- [`Prop<T>`](./prop.md)
- [`PropChildren`](./prop-children.md)
