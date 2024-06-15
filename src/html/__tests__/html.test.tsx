import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { signal } from "../../reactive";
import { BackingRoot, createRoot, h } from "../index";

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

  it("can attach a static element", () => {
    root.attach(<span>Foo</span>);
    expect(elem.innerHTML).toBe("<span>Foo</span>");
  });

  it("can tracks a dynamic text", async () => {
    const [label, setLabel] = signal("sig");
    root.attach(<span>Foo {label}</span>);
    expect(elem.innerHTML).toBe("<span>Foo sig</span>");
    setLabel("dyn");
    expect(elem.innerHTML).toBe("<span>Foo dyn</span>");
  });
});
