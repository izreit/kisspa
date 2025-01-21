import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { signal } from "../../reactive/index.js";
import { type JSXNode, type PropRef, type Root, attach, createRef, createRoot, h } from "../index.js";

describe("root", () => {
  describe("createRoot()", () => {
    let elem: HTMLElement;
    let root: Root;
    beforeAll(() => {
      elem = document.createElement("div");
      root = createRoot(elem);
    });
    afterEach(() => {
      root.detach();
    });

    it("accepts a static element", () => {
      root.attach(<span>Foo</span>);
      expect(elem.innerHTML).toBe("<span>Foo</span>");
    });

    it("can attach() twice", () => {
      root.attach(<span>Foo</span>);
      expect(elem.innerHTML).toBe("<span>Foo</span>");
      root.attach(<p>P</p>);
      expect(elem.innerHTML).toBe("<p>P</p>");
    });

    it("tracks a dynamic text", async () => {
      const [label, setLabel] = signal("sig");
      root.attach(<span>Foo {label}</span>);
      expect(elem.innerHTML).toBe("<span>Foo sig</span>");
      setLabel("dyn");
      expect(elem.innerHTML).toBe("<span>Foo dyn</span>");
    });

    it("accepts a component", async () => {
      function Foo(props: { ref?: PropRef, c: string, l: string }): JSXNode {
        return <span ref={props.ref} class={() => props.c}>{() => props.l}</span>;
      }

      const divRef = createRef<HTMLDivElement>();
      const fooRef = createRef<HTMLElement>();
      root.attach(<div ref={divRef}><Foo ref={fooRef} c={"cl"} l={"label"} /></div>);

      expect(divRef.value?.tagName.toLowerCase()).toBe("div");
      expect(fooRef.value?.tagName.toLowerCase()).toBe("span");
      expect(fooRef.value?.className).toBe("cl");
      expect(fooRef.value?.innerText).toBe("label");
      expect(fooRef.value?.parentElement).toBe(divRef.value);
    });
  });

  describe("attach()", () => {
    it("accepts a static element", () => {
      const elem = document.createElement("div");
      elem.appendChild(document.createElement("main"));

      const root = attach(<span>Foo</span>, elem);
      expect(elem.innerHTML).toBe("<span>Foo</span><main></main>");
      root.detach();
    });

    it("can specify the position by the previous node", () => {
      const elem = document.createElement("div");
      const header = document.createElement("header");
      const main = document.createElement("main");
      elem.appendChild(header);
      elem.appendChild(main);

      const root = attach(<span>Foo</span>, elem, header);
      expect(elem.innerHTML).toBe("<header></header><span>Foo</span><main></main>");
      root.detach();
    });

    it("can specify the position by the previous node, without parent", () => {
      const elem = document.createElement("div");
      const header = document.createElement("header");
      const main = document.createElement("main");
      elem.appendChild(header);
      elem.appendChild(main);

      const root = attach(<span>Foo</span>, null, main);
      expect(elem.innerHTML).toBe("<header></header><main></main><span>Foo</span>");
      root.detach();
    });
  });
});
