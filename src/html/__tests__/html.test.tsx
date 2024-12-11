import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { signal } from "../../reactive";
import { type BackingRoot, type JSXNode, type PropRef, createRef, createRoot, h } from "../index";

describe("html", () => {
  let elem: HTMLElement;
  let root: BackingRoot;
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
