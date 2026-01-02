# Contexts: createContext()

Contexts let you pass values through the tree without threading props.
If the value is reactive, all consumers update automatically.

`createContext()` creates a context with the initial value, and the returned object
includes a `<Context.Provider />` component to supply a value for descendants.
`useContext()` reads the nearest provided value (or falls back to the initial value).

It is especially useful for site-wide configuration like color theme or language of the Web site.

```tsx
import { createContext, createSignal, type PropChildren, useContext } from "kisspa";

type Theme = {
  accent: () => string;
  toggle: () => void;
};

const ThemeContext = createContext<Theme>({
  accent: () => "#888",
  toggle: () => {}
});

function ThemeProvider(props: { children?: PropChildren }) {
  const [dark, setDark] = createSignal(false);
  const theme: Theme = {
    accent: () => (dark() ? "#0ea5e9" : "#f97316"),
    toggle: () => setDark(!dark())
  };

  return (
    <ThemeContext.Provider value={theme}>
      {props.children}
    </ThemeContext.Provider>
  );
}

function ThemedButton(props: { children?: PropChildren }) {
  const theme = useContext(ThemeContext);
  return (
    <button style={{ color: () => theme.accent() }} onClick={theme.toggle}>
      {props.children}
    </button>
  );
}
```

Wrap your app with the provider and any descendant can read the theme.

## Gotcha: keep context values reactive

If the provider value is a plain object with static values, consumers will not update.
Use signals or store accessors inside the context value so consumers react to changes.

## Related APIs

- [`createContext()`](../api/create-context.md)
- [`useContext()`](../api/use-context.md)
- [`PropChildren`](../api/prop-children.md)

## Previous / Next

- Previous: [DOM Access and Lifecycle](./dom-and-lifecycle.md).
- Next: [Async Components: Suspense and Promise](./async.md).
