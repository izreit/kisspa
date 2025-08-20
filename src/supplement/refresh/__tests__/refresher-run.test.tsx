import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createLogBuffer } from "../../../html/__tests__/testutil.js";
import { Fragment, h } from "../../../html/h.js";
import { type Prop, type Refresher, type Root, createRoot, createStore, deprop, onCleanup, onMount, setRefresher, } from "../../../index.js";
import { createRefresher } from "../refresher.js";

describe("Refresher", () => {
  let elem: HTMLElement;
  let root: Root;
  let refresher: Refresher;

  beforeAll(() => {
    elem = document.createElement("div");
    root = createRoot(elem);
  });
  beforeEach(() => {
    refresher = createRefresher();
    setRefresher(refresher);
  });
  afterEach(() => {
    root.detach();
  });

  it("refreshes a component", async () => {
    const [store, setStore] = createStore({ v: 1 });

    let Foo = (props: { val: Prop<number> }) => {
      return <i>{props.val}</i>;
    };
    refresher.register(Foo, "Foo");

    await root.attach(
      <div>
        <Foo val={() => store.v} />
        <Foo val={() => store.v * 2} />
      </div>
    );

    expect(elem.innerHTML).toBe("<div><i>1</i><i>2</i></div>");
    setStore(s => s.v++);
    expect(elem.innerHTML).toBe("<div><i>2</i><i>4</i></div>");

    Foo = (props: { val: Prop<number> }) => {
      return <i>{() => deprop(props.val) * 10}</i>;
    };
    refresher.register(Foo, "Foo");
    expect(elem.innerHTML).toBe("<div><i>20</i><i>40</i></div>");
  });

  it("refreshes a component with onMount(), onCleanup()", async () => {
    const [store, setStore] = createStore({ v: 1 });
    const { log, reap } = createLogBuffer();

    let Foo = (props: { val: Prop<number> }) => {
      onMount(() => log("mount1"));
      onCleanup(() => log("cleanup1"));
      return <i>{props.val}</i>;
    };
    refresher.register(Foo, "Foo");

    await root.attach(
      <div>
        <Foo val={() => store.v} />
        <Foo val={() => store.v * 2} />
      </div>
    );

    expect(reap()).toEqual(["mount1", "mount1"]);
    expect(elem.innerHTML).toBe("<div><i>1</i><i>2</i></div>");
    setStore(s => s.v++);
    expect(elem.innerHTML).toBe("<div><i>2</i><i>4</i></div>");

    Foo = (props: { val: Prop<number> }) => {
      onMount(() => log("mount2"));
      onCleanup(() => log("cleanup2"));
      return <i>{() => deprop(props.val) * 10}</i>;
    };
    refresher.register(Foo, "Foo");

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(reap()).toEqual(["cleanup1", "cleanup1", "mount2", "mount2"]);
    expect(elem.innerHTML).toBe("<div><i>20</i><i>40</i></div>");
  });
});
