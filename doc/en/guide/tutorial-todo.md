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

Add a controlled input and an `addTodo` handler in `<App />`.

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

Use `<Show />` for the empty state and `<For />` for the list.

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
import { createEffect } from "kisspa";

// Restore from localStorage
const saved = localStorage.getItem("kisspa-todos");
if (saved) {
  const todos = JSON.parse(saved) as Todo[];
  setStore((s) => {
    s.todos = todos;
    s.nextId = todos.reduce((max, todo) => Math.max(max, todo.id), 0) + 1;
  });
}

// Save to localStorage each time store.todos changes
createEffect(() => {
  localStorage.setItem("kisspa-todos", JSON.stringify(store.todos));
});
```

Checkpoint: refresh the page and the todos remain.

## Step 6: Style with Upwind

Add `class` attributes using `$()` to improve layout.
Start small with spacing and build up from there.

## Final result

Now `main.tsx` contains something like the following.

```tsx
import { $, For, Show, attach, createEffect, createStore } from "kisspa";

type Todo = { id: number; text: string; done: boolean };

function App() {
  const [store, setStore] = createStore({
    todos: [] as Todo[],
    text: "",
    nextId: 1
  });

  const addTodo = () => {
    const text = store.text.trim();
    if (!text) return;
    setStore((s) => {
      s.todos.unshift({ id: s.nextId, text, done: false });
      s.text = "";
      s.nextId += 1;
    });
  };

  const remaining = () => store.todos.filter((todo) => !todo.done).length;

  // Restore from localStorage
  const saved = localStorage.getItem("kisspa-todos");
  if (saved) {
    const todos = JSON.parse(saved) as Todo[];
    setStore((s) => {
      s.todos = todos;
      s.nextId = todos.reduce((max, todo) => Math.max(max, todo.id), 0) + 1;
    });
  }

  // Save to localStorage each time store.todos changed
  createEffect(() => {
    localStorage.setItem("kisspa-todos", JSON.stringify(store.todos));
  });

  return (
    <main
      class={$(
        "min-height:100vh d:flex flex-direction:column gap:4n",
        "mx:auto max-w:540px px:5n py:6n",
        "bg:#f8f7f2 color:#1a1a1a border-radius:4n",
        "box-shadow:0_12px_30px_rgba(0,0,0,0.08)"
      )}
    >
      <header class={$("d:flex flex-direction:column gap:1n")}>
        <h1 class={$("font-size:1.8rem letter-spacing:-0.02em")}>Todos</h1>
        <p class={$("color:#6b7280")}>{remaining} items left</p>
      </header>
      <div class={$("d:flex gap:2n")}>
        <input
          class={$(
            "flex:1_1_auto px:3n py:2n",
            "border:1px_solid_#d1d5db border-radius:2n",
            "font-size:1rem"
          )}
          placeholder="Add a task"
          value={() => store.text}
          onInput={(event) => {
            setStore((s) => {
              s.text = event.currentTarget.value;
            });
          }}
        />
        <button
          class={$(
            "px:4n py:2n border:0 border-radius:2n",
            "bg:#111827 color:#f9fafb font-weight:600"
          )}
          onClick={addTodo}
        >
          Add
        </button>
      </div>
      <Show
        when={() => store.todos.length > 0}
        fallback={<p class={$("color:#6b7280")}>No tasks yet.</p>}
      >
        <ul
          class={$(
            "list-style:none padding:0 margin:0",
            "d:flex flex-direction:column gap:2n"
          )}
        >
          <For each={() => store.todos} key={(todo) => todo.id}>
            {(todo) => (
              <li
                class={$(
                  "d:flex align-items:center gap:2n",
                  "px:3n py:2n bg:white border-radius:2n",
                  "box-shadow:0_2px_8px_rgba(0,0,0,0.06)"
                )}
              >
                <label class={$("d:flex align-items:center gap:2n")}>
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
                  <span
                    class={$(() =>
                      todo.done
                        ? "text-decoration:line-through color:#9ca3af"
                        : "color:#111827"
                    )}
                  >
                    {() => todo.text}
                  </span>
                </label>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </main>
  );
}

attach(<App />, document.getElementById("app")!);
```

## Related APIs

- [`attach()`](../api/attach.md)
- [`createEffect()`](../api/create-effect.md)
- [`createStore()`](../api/create-store.md)
- [`<For />`](../api/for.md)
- [`<Show />`](../api/show.md)
- [`$()`](../api/dollar.md)

## Previous / Next

- Previous: [Styling with Upwind](./styling.md).
- Next: [Addendum](./addendum.md).
