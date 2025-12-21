# useContext()

## Abstract

Read the current value for a context created by [`createContext()`](./create-context.md).

## Syntax

```ts
const value = useContext(Context);
```

### Parameters

|Name|Type|Description|
|:---|:---|:---|
|`Context`|`Context<T>`|Context object previously created by `createContext()`.|

### Return value

Context value supplied by the nearest provider, or the context’s initial value when no provider is present.

## Description

`useContext()` looks up the nearest provider for the given context in the ancestors in JSX tree.

Because providers typically pass reactive accessors, consumers stay up to date without manual subscriptions.

In async components, `useContext()` must be called syncronously (i.e. before any `await`).

## Examples

```ts
import { createContext, useContext } from "kisspa";

const LocaleContext = createContext({ formatDate: (d: Date) => d.toLocaleDateString() });

function Timestamp(props: { value: Date }) {
  const locale = useContext(LocaleContext);
  return <time>{locale.formatDate(props.value)}</time>;
}

<LocaleContext.Provider value={{ formatDate: (d) => d.toISOString() }}>
  <Timestamp value={new Date()} />
</LocaleContext.Provider>;
```

## Related

- [`createContext()`](./create-context.md)
- [`<Suspense />`](./suspense.md)
