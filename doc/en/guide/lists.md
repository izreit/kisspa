# Lists: For

`<For />` maps array items to JSX and only updates the rows that changed.
`each` receives the array (or an accessor returning one), and `children` is a function that renders each item.
`key` is optional but recommended when items have unique identifiers and can reorder or be removed.

```tsx
import { For, createStore } from "kisspa";

type Todo = { id: number; text: string };

const [store] = createStore({
  todos: [
    { id: 1, text: "Docs" },
    { id: 2, text: "Tests" }
  ] as Todo[]
});

<ul>
  <For each={() => store.todos} key={(todo) => todo.id}>
    {(todo, index) => (
      <li>
        #{() => index() + 1}: {() => todo.text}
      </li>
    )}
  </For>
</ul>;
```

`each` can be a plain array or an accessor. The `children` function receives the item and
a reactive `index()` accessor that updates if the order changes.

## Gotcha: understand the default key

When you omit `key`, items are distinguished by reference equality.
Provide a stable key when items can move or be removed; avoid using the array index unless the order is permanent.

## Related APIs

- [`<For />`](../api/for.md)
- [`<Show />`](../api/show.md)

## Previous / Next

- Previous: [Conditional Rendering: Switch and Match](./switch.md).
- Next: [Portals: Portal and PortalDest](./portals.md).
