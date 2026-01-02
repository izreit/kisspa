# Reactivity Basics: Store and functions

## Stores

The states of an application can be represented as one or more stores.
Stores can be created by `createStore()` in Kisspa.

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
Any functions passed to JSX or effects that read `counterStore.value` will be notified on the next flush.

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

```tsx
import { createSignal } from "kisspa";

// Reactive message signal and its setter.
const [message, setMessage] = createSignal("Ready");

console.log(message());
setMessage("Saved");
```

`createSignal()` is the most compact way to track a single reactive value, and the getter
must be called inside JSX or effects to keep updates reactive.

## Gotcha: updates are explicit

Reactive values only track dependencies when properties are read.
If you destructure or read outside the JSX/effect context, the update will not be tracked.

## Related APIs

- [createStore()](../api/create-store.md)
- [createEffect()](../api/create-effect.md)

## Previous / Next

- Previous: [Components and JSX Primitives](./components.md).
- Next: [Reactive Components: Props and Children](./reactive-component.md).
