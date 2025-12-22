import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createStore } from "../../reactive/index.js";
// biome-ignore lint/correctness/noUnusedImports: needed for JSX
import { h } from "../h.js";
import { createRef, createRoot, type Root, Show } from "../index.js";

describe("Show", () => {
  let elem: HTMLElement;
  let root: Root;

  beforeAll(() => {
    elem = document.createElement("div");
    root = createRoot(elem);
  });
  afterEach(() => {
    root.detach();
  });

  it("can be toggled", async () => {
    const ref = createRef<HTMLElement>();
    const [store, setStore] = createStore({ foo: 0 });

    await root.attach(
      <div>
        <Show when={() => store.foo === 1}>
          <p ref={ref}>Foo</p>
        </Show>
      </div>
    );
    expect(elem.innerHTML).toBe("<div></div>");
    expect(ref.value).toBe(null);

    setStore(s => s.foo++);
    expect(elem.innerHTML).toBe("<div><p>Foo</p></div>");
    expect(ref.value).toBeInstanceOf(HTMLParagraphElement);

    setStore(s => s.foo++);
    expect(elem.innerHTML).toBe("<div></div>");
    expect(ref.value).toBe(null);
  });

  it("shows fallback if given", () => {
    const [store, setStore] = createStore({ foo: 0 });
    root.attach(
      <div>
        <Show
          when={() => store.foo !== 1}
          fallback={<span>Bar</span>}
        >
          <p>Foo {() => store.foo}</p>
        </Show>
      </div>
    );
    expect(elem.innerHTML).toBe("<div><p>Foo 0</p></div>");

    setStore(s => s.foo++);
    expect(elem.innerHTML).toBe("<div><span>Bar</span></div>");

    setStore(s => s.foo++);
    expect(elem.innerHTML).toBe("<div><p>Foo 2</p></div>");
  });

  it("propagates type guard when capture", () => {
    const [store, setStore] = createStore({ foo: 0 as number | string });
    root.attach(
      <div>
        <Show
          when={() => typeof store.foo === "number" && store.foo}
          capture
          fallback={<span>Bar</span>}
        >{val =>
          <p>Foo {() => val() * 3}</p>
        }
        </Show>
      </div>
    );
    expect(elem.innerHTML).toBe("<div><p>Foo 0</p></div>");

    setStore(s => s.foo = "pee");
    expect(elem.innerHTML).toBe("<div><span>Bar</span></div>");

    setStore(s => s.foo = 2);
    expect(elem.innerHTML).toBe("<div><p>Foo 6</p></div>");
  });

  describe("regression", () => {
    it("diposes function backing when hidden", async () => {
      const [store, setStore] = createStore({ x: 0 });

      await root.attach(
        <Show when={() => (store.x % 4) === 0}>
          {() => store.x}
        </Show>
      );
      expect(elem.innerHTML).toBe("0");

      setStore(s => s.x += 2);
      expect(elem.innerHTML).toBe("");

      setStore(s => s.x += 2);
      expect(elem.innerHTML).toBe("4");
    });
  });
});
