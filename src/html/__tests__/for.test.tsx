import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { observe } from "../../reactive/index.js";
import { For, type Root, createRoot, h } from "../index.js";
import { createLogBuffer } from "./testutil.js";

describe("For", () => {
  let elem: HTMLElement;
  let root: Root;

  beforeAll(() => {
    elem = document.createElement("div");
    root = createRoot(elem);
  });
  afterEach(() => {
    root.detach();
  });

  it("renders array", () => {
    const [store, setStore] = observe({
      peoples: [
        { name: "john", age: 50 },
        { name: "jay", age: 30 },
        { name: "jack", age: 60 },
      ]
    });

    root.attach(
      <For each={() => store.peoples}>{(people) => {
        return <div>{() => people.name} <span>({() => people.age})</span></div>
      }}</For>
    );
    expect(elem.innerHTML).toBe([
      "<div>john <span>(50)</span></div>",
      "<div>jay <span>(30)</span></div>",
      "<div>jack <span>(60)</span></div>",
    ].join(""));

    setStore(store => {
      store.peoples.push({ name: "bob", age: 3 });
      store.peoples[1].age++;
    });
    expect(elem.innerHTML).toBe([
      "<div>john <span>(50)</span></div>",
      "<div>jay <span>(31)</span></div>",
      "<div>jack <span>(60)</span></div>",
      "<div>bob <span>(3)</span></div>",
    ].join(""));
  });

  it("reflects array sorting", () => {
    const [store, setStore] = observe({
      peoples: [
        { name: "john", age: 50 },
        { name: "jay", age: 30 },
        { name: "jack", age: 60 },
        { name: "joe", age: 20 },
      ]
    });

    root.attach(
      <For each={() => store.peoples}>{(people) => {
        return <div>{() => people.name} ({() => people.age})</div>
      }}</For>
    );

    setStore(store => {
      store.peoples.sort((a, b) => a.age - b.age);
    });
    expect(elem.innerHTML).toBe([
      "<div>joe (20)</div>",
      "<div>jay (30)</div>",
      "<div>john (50)</div>",
      "<div>jack (60)</div>",
    ].join(""));
  });

  it("reflects array deletion", () => {
    const [store, setStore] = observe({
      peoples: [
        { name: "john", age: 50 },
        { name: "jay", age: 30 },
        { name: "jack", age: 60 },
        { name: "joe", age: 20 },
      ]
    });

    root.attach(
      <For each={() => store.peoples}>{(people) => {
        return <div>{() => people.name} ({() => people.age})</div>
      }}</For>
    );

    setStore(s => {
      // biome-ignore lint/performance/noDelete: intentional. testing delete.
      delete s.peoples[1];
    });
    expect(elem.innerHTML).toBe([
      "<div>john (50)</div>",
      "<div>jack (60)</div>",
      "<div>joe (20)</div>",
    ].join(""));
  });

  it("reflects array removed", () => {
    const [store, setStore] = observe({
      peoples: [
        { name: "john", age: 50 },
        { name: "jay", age: 30 },
        { name: "jack", age: 60 },
        { name: "joe", age: 20 },
      ]
    });

    root.attach(
      <For each={() => store.peoples}>{(people) => {
        return <div>{() => people.name} ({() => people.age})</div>
      }}</For>
    );

    setStore(s => {
      s.peoples.splice(1, 1);
    });
    expect(elem.innerHTML).toBe([
      "<div>john (50)</div>",
      "<div>jack (60)</div>",
      "<div>joe (20)</div>",
    ].join(""));
  });

  it("provides indices for callback", () => {
    const { log, reap: reapLog } = createLogBuffer();
    const [store, setStore] = observe({
      peoples: [
        { name: "john", age: 50 },
        { name: "jay", age: 30 },
        { name: "jack", age: 60 },
      ]
    });

    root.attach(
      <For each={() => store.peoples}>{(people, ix) => {
        log(ix() + people.name);
        return <div>{() => ix() + 1}. {() => people.name} ({() => people.age})</div>
      }}</For>
    );
    expect(elem.innerHTML).toBe([
      "<div>1. john (50)</div>",
      "<div>2. jay (30)</div>",
      "<div>3. jack (60)</div>",
    ].join(""));
    expect(reapLog()).toEqual(["0john", "1jay", "2jack"]);

    setStore(s => {
      s.peoples.splice(1, 0, { name: "judy", age: 70 });
    });

    // Confirm that indices (in above innerHTML) are updated
    expect(elem.innerHTML).toBe([
      "<div>1. john (50)</div>",
      "<div>2. judy (70)</div>",
      "<div>3. jay (30)</div>",
      "<div>4. jack (60)</div>",
    ].join(""));

    // But callbacks of <For> correspondings them are not called again: only indices are updated
    expect(reapLog()).toEqual(["1judy"]);
  });

  it("accepts static array", () => {
    const [store, setStore] = observe({
      peoples: [
        { name: "john", age: 50 },
        { name: "jay", age: 30 },
        { name: "jack", age: 60 },
      ]
    });

    root.attach(
      <For each={store.peoples}>{(people) => {
        return <div>{() => people.name} <span>({() => people.age})</span></div>
      }}</For>
    );
    expect(elem.innerHTML).toBe([
      "<div>john <span>(50)</span></div>",
      "<div>jay <span>(30)</span></div>",
      "<div>jack <span>(60)</span></div>",
    ].join(""));

    setStore(store => {
      store.peoples.push({ name: "bob", age: 3 });
      store.peoples[1].age++;
    });
    // Although `each` is not function, <For/> is still reactive because `each` is always array but not primitive.
    // We may not need to accept functions for `each`?
    expect(elem.innerHTML).toBe([
      "<div>john <span>(50)</span></div>",
      "<div>jay <span>(31)</span></div>",
      "<div>jack <span>(60)</span></div>",
      "<div>bob <span>(3)</span></div>",
    ].join(""));
  });
});
