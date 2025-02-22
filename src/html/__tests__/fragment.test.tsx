import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { observe } from "../../reactive/index.js";
import { type Root, createRoot } from "../index.js";
import { Fragment, h } from "../h.js";

describe("Fragment", () => {
  let elem: HTMLElement;
  let root: Root;

  beforeAll(() => {
    elem = document.createElement("div");
    root = createRoot(elem);
  });
  afterEach(() => {
    root.detach();
  });

  it("accepts multiple children", () => {
    root.attach(
      <>
        <span>Foo</span>
        <div>Bar</div>
      </>
    );
    expect(elem.innerHTML).toBe("<span>Foo</span><div>Bar</div>");
  });

  it("can be nested", () => {
    const [store, _setStore] = observe({ foo: 0 });
    root.attach(
      <>
        <span>Foo</span>
        <div>
          <>
            { store.foo }
            <p>Zoo</p>
          </>
        </div>
      </>
    );
    expect(elem.innerHTML).toBe("<span>Foo</span><div>0<p>Zoo</p></div>");
  });
});
