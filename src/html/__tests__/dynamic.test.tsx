import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { observe } from "../../reactive";
import { Dynamic, type Root, createRoot, h } from "../index";

describe("Dynamic", () => {
  let elem: HTMLElement;
  let root: Root;

  beforeAll(() => {
    elem = document.createElement("div");
    root = createRoot(elem);
  });
  afterEach(() => {
    root.detach();
  });

  it("switches components", () => {
    function CompA(props: { x: number }) {
      return <div>CompA {() => props.x}</div>;
    }
    function CompB(props: { x: number }) {
      return <span>CompB {() => props.x + 100}</span>;
    }

    const [store, setStore] = observe({ selector: 0, val: 0});
    root.attach(
      <Dynamic
        component={() => store.selector % 2 === 0 ? CompA : CompB}
        props={() => ({ x: store.val })}
      />
    );
    expect(elem.innerHTML).toBe("<div>CompA 0</div>");

    setStore(s => s.selector++);
    expect(elem.innerHTML).toBe("<span>CompB 100</span>");
    setStore(s => s.val += 10);
    expect(elem.innerHTML).toBe("<span>CompB 110</span>");
    setStore(s => {
      s.selector++;
      s.val += 10;
    });
    expect(elem.innerHTML).toBe("<div>CompA 20</div>");
  });
});
