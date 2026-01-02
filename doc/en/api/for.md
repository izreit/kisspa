# \<For />

Render a collection by mapping each item to JSX with fine-grained reactivity.

## Usage

```tsx
<For each={items} key={keyFn}>{(item, index) => JSXNode}</For>
```

### Props

|Name|Type|Description|
|:---|:---|:---|
|`each`|`E[] \| () => E[]`|Array of items or accessor returning one. Reactive sources trigger diffs.|
|`key`|`(item: E, index: number) => unknown` (optional)|Identifier used to preserve DOM nodes across reorders. Defaults to the item itself.|
|`children`|`(item: E, index: () => number) => JSXNode`|Render function. The reactive `index` accessor reflects the item’s current position.|

## Description

`<For />` observes the `each` source and incrementally updates the DOM.
When an item moves, existing DOM nodes are repositioned instead of remounted.
The `index` accessor you receive stays live - when an item shifts, reading `index()` yields the updated position without re-running your render function.

If `each` is a plain array, `<For />` still reacts to structural changes because it inspects the mutated array each time reactive parents update.

The `key` prop is optional but recommended when items have unique identifiers and may reorder or be removed; otherwise objects are distinguished by reference equality.

## Examples

```ts
import { For, createStore } from "kisspa";

const [store, setStore] = createStore({ todos: [{ id: 1, text: "Docs" }] });

<ul>
  <For each={() => store.todos} key={(todo) => todo.id}>
    {(todo, index) => (
      <li>
        #{() => index() + 1}: {() => todo.text}
      </li>
    )}
  </For>
</ul>;

setStore((s) => {
  s.todos.unshift({ id: 2, text: "Tests" });
});
```

## Related

- [`<Show />`](./show.md)
- [`<Switch />`](./switch.md)
