# Reactivity Basics: Store and functions

The state of an application can be represented by one or more stores.
Stores can be created with `createStore()` in Kisspa.

`createStore()` returns a read proxy and a setter for an object you can update in place.
Reads are tracked when you access properties on the proxy.

```tsx
import { createStore } from "kisspa";

// Reactive counter store and its setter.
const [counterStore, setCounterStore] = createStore({ value: 0, step: 1 });

console.log(counterStore.value);
setCounterStore((s) => {
  s.value += s.step;
});
```

This logs the current value, then updates the store in place.

Any functions passed to JSX or effects that read `counterStore.value` will be notified on change.

## Minimal counter component

Now bring components back into the mix and render a simple counter.

```tsx
import { attach, createStore } from "kisspa";

function Counter() {
  // Reactive counter store and its setter.
  const [countStore, setCountStore] = createStore({ value: 0, step: 1 });
  // Derived value computed from the store.
  const double = () => countStore.value * 2;

  return (
    <section>
      <h1>Counter</h1>
      <p>Count: {() => countStore.value}</p>
      <p>Double: {double}</p>
      <button
        onClick={() => {
          setCountStore((s) => {
            s.value += s.step;
          });
        }}
      >
        Increment
      </button>
    </section>
  );
}

attach(<Counter />, document.getElementById("app")!);
```

Note that we write functions like `() => countStore.value` but not `countStore.value` itself in JSX.
When a function that reads from the store is placed in JSX, Kisspa tracks that read and re-runs the function
whenever the store changes, updating only the affected DOM nodes.
This simple rule keeps updates precise and efficient: the component does not re-run, and only the text or
element that depends on the changed data is recalculated.

Clicking the button updates the store, which in turn updates both the count and double text because the JSX reads them through functions.

## Effects

Use `createEffect()` when you want to react to store reads outside JSX.

```tsx
import { createEffect, createStore } from "kisspa";

// Reactive message store and its setter.
const [messageStore, setMessageStore] = createStore({
  text: "Ready",
  status: "idle"
});

createEffect(() => {
  console.log("Status:", messageStore.status, messageStore.text);
});

setTimeout(() => {
  setMessageStore((s) => {
    s.text = "Saved";
    s.status = "done";
  });
}, 1000);
```

The effect runs immediately, prints the current message, and runs again after the timeout updates the store.

## Signals for single values

When you only need one reactive value, `createSignal()` keeps the state compact and direct.
`createSignal()` returns a pair of an accessor function and a setter function.

```tsx
import { createSignal } from "kisspa";

const [message, setMessage] = createSignal("Ready");

console.log(message());
setMessage("Saved");
```

It uses `createStore()` under the hood and so `message` can be passed to JSX to make the value reactive.

## Gotcha: updates are explicit

Reactive values only track dependencies when properties are read.
If you destructure or read outside the JSX/effect context, the update will not be tracked.

```tsx
import { createStore } from "kisspa";

const [store, setStore] = createStore({ count: 0 });

// NG: destructure the store value outside JSX/effect context.
function Counter_NG() {
  const { count } = store;
  return <p>Count: {() => count}</p>;
}

// OK: access the store value inside a function passed to JSX.
function Counter_OK() {
  const count = () => store.count;
  return <p>Count: {count}</p>;
}
```

## Comparison to Solid

The pattern of embedding functions in JSX is inspired by Solid, where accessors drive fine-grained updates.
Kisspa follows the same idea of tracking reads at the point of use, but keeps the surface smaller and more explicit:
no implicit code injected at build time. Updates are tied to functions you pass to JSX.

Solid is a more sophisticated solution, but we prefer a simple, explicit rule and minimal build complexity.

## Related APIs

- [createStore()](../api/create-store.md)
- [createEffect()](../api/create-effect.md)

## Previous / Next

- Previous: [Components and JSX Primitives](./components.md).
- Next: [Reactive Components: Props and Children](./reactive-component.md).
