import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createStore } from "../../reactive/index.js";
// biome-ignore lint/correctness/noUnusedImports: needed for JSX
import { h } from "../h.js";
import { createRoot, Match, type Root, Switch } from "../index.js";

describe("Switch", () => {
  let elem: HTMLElement;
  let root: Root;

  beforeAll(() => {
    elem = document.createElement("div");
    root = createRoot(elem);
  });
  afterEach(() => {
    root.detach();
  });

  it("selects Match", async () => {
    const [store, setStore] = createStore({ x: 4 as number | string});
    root.attach(
      <Switch>
        <Match when={() => typeof store.x === "number" && 0 <= store.x && store.x < 10}>
          <div>smallnum:{() => "" + store.x}</div>
        </Match>
        <Match when={() => typeof store.x === "string"}>
          <div>str:{() => store.x}</div>
        </Match>
      </Switch>
    );
    expect(elem.innerHTML).toBe("<div>smallnum:4</div>");
    setStore(s => s.x = "foo");
    expect(elem.innerHTML).toBe("<div>str:foo</div>");
    setStore(s => s.x = 100);
    expect(elem.innerHTML).toBe("");
  });

  it("prefers preceded Match", async () => {
    const [store, setStore] = createStore({ x: 4 as number | string});
    root.attach(
      <Switch>
        <Match when={() => typeof store.x === "number" && 0 <= store.x && store.x < 10}>
          <div>smallnum:{() => "" + store.x}</div>
        </Match>
        <Match when={() => typeof store.x === "number" && 0 <= store.x && store.x < 10}>
          <div>NEVERUSED</div>
        </Match>
        <Match when={() => typeof store.x === "string"}>
          <div>str:{() => store.x}</div>
        </Match>
      </Switch>
    );
    expect(elem.innerHTML).toBe("<div>smallnum:4</div>");
    setStore(s => s.x = "foo");
    expect(elem.innerHTML).toBe("<div>str:foo</div>");
    setStore(s => s.x = 100);
    expect(elem.innerHTML).toBe("");
  });

  it("can provide type guard", async () => {
    const [store, setStore] = createStore({ x: 4 as number | string});
    root.attach(
      <Switch>
        <Match when={() => (typeof store.x === "number" && 0 <= store.x && store.x < 10) && store.x} capture>{x => (
          <div>smallnum:{() => x() * 3}</div>
        )}
        </Match>
        <Match when={() => (typeof store.x === "string") && store.x} capture>{(val) => (
          <div>str:{() => val().charCodeAt(0)}</div>
        )}
        </Match>
      </Switch>
    );
    expect(elem.innerHTML).toBe("<div>smallnum:12</div>");
    setStore(s => s.x = "foo");
    expect(elem.innerHTML).toBe("<div>str:102</div>");
    setStore(s => s.x = "g");
    expect(elem.innerHTML).toBe("<div>str:103</div>");
    setStore(s => s.x = 100);
    expect(elem.innerHTML).toBe("");
  });

  it("fallbacks to the condition-less Match", async () => {
    const [store, setStore] = createStore({ x: 4 as number | string});
    root.attach(
      <Switch>
        <Match when={() => (typeof store.x === "number" && 0 <= store.x && store.x < 10) && store.x} capture>{x => (
          <div>smallnum:{() => x() * 3}</div>
        )}
        </Match>
        <Match when={() => (typeof store.x === "string") && store.x} capture>{(val) => (
          <div>str:{() => val().charCodeAt(0)}</div>
        )}
        </Match>
        <Match>
          <p>Fallback</p>
        </Match>
      </Switch>
    );
    expect(elem.innerHTML).toBe("<div>smallnum:12</div>");
    setStore(s => s.x = 5);
    expect(elem.innerHTML).toBe("<div>smallnum:15</div>");
    setStore(s => s.x = 100);
    expect(elem.innerHTML).toBe("<p>Fallback</p>");
    setStore(s => s.x = "foo");
    expect(elem.innerHTML).toBe("<div>str:102</div>");
  });
});
