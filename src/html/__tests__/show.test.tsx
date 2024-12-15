import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { observe } from "../../reactive";
import { type Root, Show, createRoot, h } from "../index";

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

  it("can be toggled", () => {
    const [store, setStore] = observe({ foo: 0 });
    root.attach(
      <div>
        <Show when={() => store.foo === 1}>
          <p>Foo</p>
        </Show>
      </div>
    );
    expect(elem.innerHTML).toBe("<div></div>");

    setStore(s => s.foo++);
    expect(elem.innerHTML).toBe("<div><p>Foo</p></div>");

    setStore(s => s.foo++);
    expect(elem.innerHTML).toBe("<div></div>");
  });

  it("shows fallback if given", () => {
    const [store, setStore] = observe({ foo: 0 });
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
});
