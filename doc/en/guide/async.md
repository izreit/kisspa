# Async Components: Suspense and Promise

`<Suspense />` tracks promises created while rendering its children.
While pending, it renders the fallback; when resolved, it swaps to the real content.

```tsx
import { Suspense } from "kisspa";

async function UserCard(props: { id: () => string }) {
  const user = await fetch(`/api/user/${props.id()}`).then((res) => res.json());
  return <article>{user.name}</article>;
}

function UserPanel(props: { id: () => string }) {
  return (
    <Suspense
      fallback={<p>Loading user...</p>}
      errorFallback={(error, reset) => (
        <div>
          <p>Failed: {String(error)}</p>
          <button onClick={reset}>Retry</button>
        </div>
      )}
    >
      <UserCard id={props.id} />
    </Suspense>
  );
}
```

`<Suspense />` keeps your tree stable while `UserCard` awaits. The `fallback` renders
while the promise is pending, and `errorFallback` renders if a promise rejects or throws.

## Rendering promises in JSX

You can also return a promise directly inside `<Suspense />` as a shorter form.

```tsx
import { Suspense } from "kisspa";

function UserCard(props: { id: () => string }) {
  return (
    <Suspense fallback={<p>Loading user...</p>}>
      {fetch(`/api/user/${props.id()}`)
        .then((res) => res.json())
        .then((user) => <article>{user.name}</article>)}
    </Suspense>
  );
}
```

## Gotcha: wrap async branches

If you render promises without a surrounding `<Suspense />`, nothing will display until they resolve.
Always place async reads inside a suspense boundary.

## Related APIs

- [`<Suspense />`](../api/suspense.md)
- [`createRoot()`](../api/create-root.md)

## Previous / Next

- Previous: [Contexts: createContext()](./contexts.md).
- Next: [Dynamic Components: Dynamic](./dynamic.md).
