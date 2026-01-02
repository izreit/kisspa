# Wrapping up: Build a Todo App

This walkthrough ties together the guide with a small todo app.
Follow each step and keep the code running as you go.

## Step 1: Set up the store and root

Create a `main.tsx` that mounts the app and sets up a store for todos.

```tsx
import { attach, createStore } from "kisspa";

type Todo = { id: number; text: string; done: boolean };

function App() {
  const [store, setStore] = createStore({
    todos: [] as Todo[],
    text: "",
    nextId: 1
  });

  return (
    <main>
      <h1>Todos</h1>
    </main>
  );
}

attach(<App />, document.getElementById("app")!);
```

Checkpoint: the page shows the header.

## Step 2: Input and add button

Add a controlled input and an `addTodo` handler.

```tsx
const addTodo = () => {
  const text = store.text.trim();
  if (!text) return;
  setStore((s) => {
    s.todos.unshift({ id: s.nextId, text, done: false });
    s.text = "";
    s.nextId += 1;
  });
};

return (
  <main>
    <h1>Todos</h1>
    <div>
      <input
        placeholder="Add a task"
        value={() => store.text}
        onInput={(event) => {
          setStore((s) => {
            s.text = event.currentTarget.value;
          });
        }}
      />
      <button onClick={addTodo}>Add</button>
    </div>
  </main>
);
```

Checkpoint: typing and pressing Add updates the store.

## Step 3: Render the list

Use `<Show />` for empty state and `<For />` for the list.

```tsx
import { For, Show } from "kisspa";

<Show when={() => store.todos.length > 0} fallback={<p>No tasks yet.</p>}>
  <ul>
    <For each={() => store.todos} key={(todo) => todo.id}>
      {(todo) => (
        <li>
          <label>
            <input
              type="checkbox"
              checked={() => todo.done}
              onChange={() => {
                setStore((s) => {
                  const item = s.todos.find((t) => t.id === todo.id);
                  if (item) item.done = !item.done;
                });
              }}
            />
            {() => todo.text}
          </label>
        </li>
      )}
    </For>
  </ul>
</Show>;
```

Checkpoint: list items appear and toggle.

## Step 4: Derived values

Add computed helpers for counts and filtering.

```tsx
const remaining = () => store.todos.filter((todo) => !todo.done).length;

<p>{remaining} items left</p>;
```

Any JSX that reads `remaining()` updates when todos change.

## Step 5: Persist to localStorage

Load saved data on mount and save changes with an effect.

```tsx
import { createEffect, onMount } from "kisspa";

onMount(() => {
  const saved = localStorage.getItem("kisspa-todos");
  if (saved) {
    const todos = JSON.parse(saved) as Todo[];
    setStore((s) => {
      s.todos = todos;
      s.nextId = todos.reduce((max, todo) => Math.max(max, todo.id), 0) + 1;
    });
  }
});

createEffect(() => {
  localStorage.setItem("kisspa-todos", JSON.stringify(store.todos));
});
```

Checkpoint: refresh the page and the todos remain.

## Step 6: Style with Upwind

Add `class` attributes using `$()` to improve layout.
Start small with spacing and build up from there.

## Related APIs

- [`createStore()`](../api/create-store.md)
- [`<For />`](../api/for.md)
- [`<Show />`](../api/show.md)
- [`$()`](../api/dollar.md)

## Previous / Next

- Previous: [Styling with Upwind](./styling.md).
- Return to top: [Guide Index](./README.md).
