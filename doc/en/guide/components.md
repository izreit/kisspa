# Components and JSX Primitives

In Kisspa, a component is a plain function that returns JSX.
JSX is the HTML-like syntax inside JavaScript; Kisspa turns it into real DOM nodes.
As components, functions run once for each instance in JSX to build the tree, and fine-grained reactivity updates only the parts of the DOM that depend on reactive reads.

```tsx
// Props for a reusable button component.
type ButtonProps = {
  label: string;
  onClick?: () => void;
};

function Button(props: ButtonProps) {
  return (
    <button class="btn" onClick={props.onClick}>
      { props.label }
    </button>
  );
}

// Now you can use `Button` in JSX like:
//   <Button label="Show a message" onClick={() => { alert("Hello!"); }} />
```

`Button` renders a native `<button>` element with a label and an optional click handler.
If you omit `onClick`, it behaves like a normal button with no handler attached.

## Props and children

Props are the inputs you pass to a component, similar to function arguments.
In JSX, attributes like `title="Inbox"` become fields on the `props` object.

A special prop named `children` receives the child nodes of a compoonent in JSX.

```tsx
import { attach, type PropChildren } from "kisspa";

// Props for a card layout component.
type CardProps = {
  title: string;
  children?: PropChildren; // type PropChildren is explained later.
};

function Card(props: CardProps) {
  return (
    <section class="card">
      <h2>{props.title}</h2>
      <div>{props.children}</div>
    </section>
  );
}

function App() {
  return (
    <Card title="Inbox">
      <p>3 unread messages</p>
      <Button label="Open" onClick={() => alert("Open")} />
    </Card>
  );
}

attach(<App />, document.getElementById("app")!);
```

The `Card` component lays out a title and body, while `App` composes it with a paragraph and the `Button` you saw earlier. Mounting `App` with `attach` reuses the entry-point pattern from the previous page.

## Events and attributes

DOM attributes map closely to HTML, and events use camelCase with function handlers.

```tsx
function SearchInput() {
  return (
    <input
      type="search"
      placeholder="Search"
      onInput={(event) => {
        // `event` is the input event fired by the search field.
        console.log(event.currentTarget.value);
      }}
    />
  );
}
```

Typing into the field logs the current value on every input event, showing how event handlers receive the real DOM event object.

## Previous / Next

- Previous: [Getting Started](./getting-started.md).
- Next: [Reactivity Basics: createStore() and functions](./reactivity.md).
