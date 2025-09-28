# createContext<T>()

Define a context with an initial value and a provider component.

## Syntax

```ts
const MyContext = createContext(initialValue);
```

### Parameters

|Name|Type|Description|
|:---:|:---:|:---|
|`initialValue`|`T` (`any`)|Default value returned when no provider is found.|

### Return value

A newly created `Context`, used with [`useContext()`](./use-context.md) to read values.

Use `<Context.Provider />` to supply a value for descendants.

## Description

`createContext()` creates a new context object.
Use the provided `Provider` component to supply a new value for descendants.
The value provided by the provider is available even inside async components, promises, and [`Suspense`](./suspense.md) boundaries.

If a component reads the context without any surrounding provider, `useContext()` falls back to the `initialValue` supplied here.

Context values participate in the normal reactive system.
Passing accessors (for example, from stores or signals) keeps consumers updated when values change.

## Examples

```tsx
import { createContext, useContext } from "kisspa";

interface Theme {
  accent: () => string;
}

const ThemeContext = createContext<Theme>({ accent: () => "#888" });

function Button(props: { children?: PropChildren }) {
  const theme = useContext(ThemeContext);
  return <button style={{ color: () => theme.accent() }}>{props.children}</button>;
}

function ThemedSubmitButton() {
  return (
    <ThemeContext.Provider value={{ accent: () => "#f80" }}>
      <Button>Submit</Button>
    </ThemeContext.Provider>
  );
}
```

## Related

- [`useContext()`](./use-context.md)
- [`PropChildren`](./prop-children.md)
