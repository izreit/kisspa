import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { observe, signal } from "../../reactive";
import { type JSXNode, Portal, PortalDest, type Root, Show, createRoot, h } from "../index";

describe("Portal", () => {
  let elem: HTMLElement;
  let root: Root;

  beforeAll(() => {
    elem = document.createElement("div");
    root = createRoot(elem);
  });
  afterEach(() => {
    root.detach();
  });

  it("can render outside the root", async () => {
    function Comp0(props: { x: () => number }): JSXNode {
      return (
        <section>
          <Portal to={outerDest}>
            <div>x is {props.x}</div>
          </Portal>
        </section>
      );
    }

    const [store, setStore] = observe({ x: 10 });
    const outerDest = document.createElement("p");
    root.attach(<main><Comp0 x={() => store.x} /></main>);
    expect(elem.innerHTML).toBe("<main><section></section></main>");
    expect(outerDest.innerHTML).toBe("<div>x is 10</div>");

    setStore(s => s.x += 10);
    expect(outerDest.innerHTML).toBe("<div>x is 20</div>");
  });

  it("can target specified by Symbol", async () => {
    const key = Symbol("portalKey");

    function Comp0(props: { x: () => number }): JSXNode {
      return (
        <section>
          <Portal to={key}>
            <div>x is {props.x}</div>
          </Portal>
        </section>
      );
    }

    const [store, setStore] = observe({ x: 10 });
    root.attach(
      <main>
        <Comp0 x={() => store.x} />
        <p>
          <PortalDest from={key} />
          foo
        </p>
      </main>
    );
    expect(elem.innerHTML).toBe("<main><section></section><p><div>x is 10</div>foo</p></main>");
    setStore(s => s.x += 10);
    expect(elem.innerHTML).toBe("<main><section></section><p><div>x is 20</div>foo</p></main>");
  });

  it("can be hidden by Show", async () => {
    const key = Symbol("portalKey");

    const [showFrom, setShowFrom] = signal(true);
    const [showDest, setShowDest] = signal(true);

    function Comp0(props: { x: () => number }): JSXNode {
      return (
        <section>
          <Show when={showFrom}>
            <Portal to={key}>
              <div>x is {props.x}</div>
            </Portal>
            bar
          </Show>
        </section>
      );
    }

    root.attach(
      <main>
        <Comp0 x={() => 10} />
        <p>
          <Show when={showDest}>
            <PortalDest from={key} />
            foo
          </Show>
        </p>
      </main>
    );
    expect(elem.innerHTML).toBe("<main><section>bar</section><p><div>x is 10</div>foo</p></main>");

    setShowDest(false);
    expect(elem.innerHTML).toBe("<main><section>bar</section><p></p></main>");

    setShowFrom(false);
    expect(elem.innerHTML).toBe("<main><section></section><p></p></main>");

    setShowDest(true);
    expect(elem.innerHTML).toBe("<main><section></section><p>foo</p></main>");

    setShowFrom(true);
    expect(elem.innerHTML).toBe("<main><section>bar</section><p><div>x is 10</div>foo</p></main>");
  });
});
