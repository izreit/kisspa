import { describe, expect, it } from "vitest";
import { bindObserver, cancelEffect, createEffect, createStore, debugGetInternal, withoutObserver } from "../core.js";
import { createLogBuffer } from "./testutil.js";

describe("createStore", () => {
  it("can be read/modified", () => {
    const [store, setStore] = createStore({ foo: 4 });
    expect(store.foo).toBe(4);
    setStore(s => { s.foo *= 2 });
    expect(store.foo).toBe(8);
  });

  it("can watch a simple object", async () => {
    const internal = debugGetInternal();

    const raw = { foo: 4 };
    const [store, setStore] = createStore(raw);
    const [readProxy, writeProxy] = internal.wrap(raw);
    expect(readProxy).toBe(store);

    expect(store.foo).toBe(4);
    expect(internal.refTable.table_.has(store)).toBe(false);
    expect(internal.memoizedTable.get(writeProxy)?.[0]).toBe(store);

    let squareFoo = 0;
    const observer = () => { squareFoo = store.foo ** 2; };
    createEffect(observer);
    expect(store.foo).toBe(4);
    expect(squareFoo).toBe(16); // createEffect() calls the observer func imidiately
    expect(internal.refTable.table_.get(readProxy)?.get("foo")?.has(observer)).toBe(true);
    expect(internal.refTable.table_.get(readProxy)?.get("foo")?.size).toBe(1);
    expect(internal.refTable.reverseTable_.get(observer)?.get(readProxy)?.has("foo")).toBe(true);
    expect(internal.refTable.reverseTable_.get(observer)?.get(readProxy)?.size).toBe(1);

    setStore(s => { s.foo *= 2; });
    expect(store.foo).toBe(8);

    expect(squareFoo).toBe(64);

    setStore(s => { s.foo = 14; });
    expect(squareFoo).toBe(196);
  });

  it("can watch array", async () => {
    const raw = [100, 20, 32, 5];
    const [store, setStore] = createStore(raw);

    let val = 0;
    createEffect(() => { val = store[0]; });
    expect(store[0]).toBe(100);

    setStore(v => { v.shift(); v.push(77); });
    setStore(v => { v.splice(0, 0, 45, 46); });
    expect(val).toBe(45);

    setStore(v => { v.sort((a, b) => a - b); });
    expect(val).toBe(5);
  });

  it("can watch nested values and its stractural modification", async () => {
    interface Person {
      givenName: string;
      values: number[];
    }
    interface Store {
      activeId: string;
      table: { [key: string]: Person };
    }

    const raw: Store = {
      activeId: "bbb",
      table: {
        "aaa": { givenName: "John", values: [1, 2, 3] },
        "bbb": { givenName: "Mike", values: [100, 120] },
        "ccc": { givenName: "Paul", values: [-5, -8] },
      }
    };
    const [store, setStore] = createStore(raw);

    let callCount = 0;
    let lastValue: number = Infinity;
    createEffect(() => {
      callCount++;
      const a = store.table[store.activeId].values;
      lastValue = a[a.length - 1];
    });
    expect(callCount).toBe(1);
    expect(lastValue).toBe(120);

    setStore(v => { v.table.ccc.values.push(-45); });
    expect(callCount).toBe(1);
    expect(lastValue).toBe(120);

    setStore(v => { v.activeId = "ccc"; });
    expect(callCount).toBe(2);
    expect(lastValue).toBe(-45);

    setStore(v => { v.table = { "ccc": { givenName: "Bob", values: [10001] } }; });
    expect(callCount).toBe(3);
    expect(lastValue).toBe(10001);

    setStore(v => { v.table.ccc = { givenName: "Alice", values: [42] }; });
    expect(callCount).toBe(4);
    expect(lastValue).toBe(42);
  });

  it("can be untracked", async () => {
    const [store, setStore] = createStore({ count: 0 });

    let countClone0 = 0;
    let countClone1 = 0;
    const copyCount0 = () => { countClone0 = store.count; }
    createEffect(copyCount0);
    createEffect(() => { countClone1 = store.count; });

    setStore(s => { s.count += 42 });
    expect(countClone0).toBe(42);
    expect(countClone1).toBe(42);

    cancelEffect(copyCount0);
    setStore(s => { s.count -= 10 });
    expect(countClone0).toBe(42); // now it has never been updated
    expect(countClone1).toBe(32);
  });

  it("doesn't call unrelated observers", async () => {
    const raw = [
      { firstName: "john", age: 10 },
      { firstName: "mary", age: 24 },
      { firstName: "tom", age: 32 },
      { firstName: "chris", age: 29 },
    ];
    const [store, setStore] = createStore(raw);

    let observerChrisCount = 0;
    let ageOfChris: number | null = null;
    const observerChris = () => {
      observerChrisCount++;
      ageOfChris = store.find(e => e.firstName === "chris")?.age ?? -1;
    };

    let observerSecondCount = 0;
    let ageOfSecond: number | null = null;
    const observerSecond = () => {
      observerSecondCount++;
      ageOfSecond = store[1]?.age ?? -1;
    };

    createEffect(observerChris);
    createEffect(observerSecond);
    expect(observerChrisCount).toBe(1);
    expect(observerSecondCount).toBe(1);

    setStore(v => { v.push({ firstName: "robert", age: 79 }); });
    setStore(v => { v.push({ firstName: "daniel", age: 80 }); });
    expect(observerChrisCount).toBe(3);
    expect(observerSecondCount).toBe(1);
    expect(ageOfChris).toBe(29);
    expect(ageOfSecond).toBe(24);

    setStore(v => { v.unshift({ firstName: "jay", age: 81 }) });
    expect(observerChrisCount).toBe(4);
    expect(observerSecondCount).toBe(2);
    expect(ageOfChris).toBe(29);
    expect(ageOfSecond).toBe(10);

    setStore(v => { v.find(e => e.firstName === "chris")!.age++; });
    expect(observerChrisCount).toBe(5);
    expect(observerSecondCount).toBe(2);
    expect(ageOfChris).toBe(30);
    expect(ageOfSecond).toBe(10);
  });

  it("can suppress synchronous flush", async () => {
    const raw = { values: ["fee", "bar", "zoo", "buzz", "woohoo"] };
    const [store, setStore] = createStore(raw);

    let caps = "";
    createEffect(() => { caps = store.values.map(s => s[0]).join(""); });
    expect(caps).toBe("fbzbw");

    setStore(s => { s.values[2] = "BOO"; }, { lazyFlush: true });
    expect(caps).toBe("fbzbw"); // for lazyFlush, related effects will not be invoked synchronously.
    await Promise.resolve();
    expect(caps).toBe("fbBbw"); // updated after async gap.

    setStore(s => { s.values.push("A"); }, { lazyFlush: true });
    expect(caps).toBe("fbBbw"); // not updated yet.
    setStore(s => { s.values.shift(); });
    expect(caps).toBe("bBbwA"); // non-lazyFlush setStore() also flush the modification
  });

  it("rejects array modification outside setter", async () => {
    const raw = [100, 20, 32, 5];
    const [store, _setStore] = createStore(raw);
    expect(() => store.sort((a, b) => a - b)).toThrow((/^can't alter '\d+' without setter/));
  });

  it("can watch multiple stores", async () => {
    const internal = debugGetInternal();

    const raw1 = { index: 1 };
    const raw2 = { values: ["fee", "bar", "zoo", "buzz", "woohoo"] };
    const [store1, setStore1] = createStore(raw1);
    const [store2, setStore2] = createStore(raw2);

    let value: string | null = null;
    const observer1 = () => { value = store2.values[store1.index].slice(1) };
    createEffect(observer1);

    expect(value).toBe("ar");
    expect(internal.refTable.table_.get(store1)?.get("index")?.has(observer1)).toBe(true);
    expect(internal.refTable.table_.get(store2)?.get("values")?.has(observer1)).toBe(true);
    expect(internal.refTable.table_.get(store2.values)?.get("1")?.has(observer1)).toBe(true);
    expect(internal.refTable.table_.get(store2.values)?.get("2")?.has(observer1)).toBe(undefined);
    expect(internal.refTable.reverseTable_.get(observer1)?.get(store1)?.has("index")).toBe(true);
    expect(internal.refTable.reverseTable_.get(observer1)?.get(store2)?.has("values")).toBe(true);
    expect(internal.refTable.reverseTable_.get(observer1)?.get(store2.values)?.has("1")).toBe(true);
    expect(internal.refTable.reverseTable_.get(observer1)?.get(store2.values)?.has("2")).toBe(false);

    setStore1(v => { v.index = 0; });
    setStore1(v => { v.index = 3; });
    setStore2(v => { v.values = ["ss1", "ss2", "ss3", "ss4"]; });
    expect(raw1.index).toBe(3);

    expect(value).toBe("s4");
    expect(internal.refTable.table_.get(store1)?.get("index")?.has(observer1)).toBe(true);
    expect(internal.refTable.table_.get(store2)?.get("values")?.has(observer1)).toBe(true);
    expect(internal.refTable.table_.get(store2.values)?.get("1")?.has(observer1)).toBe(undefined); // not false because .values changed
    expect(internal.refTable.table_.get(store2.values)?.get("2")?.has(observer1)).toBe(undefined);
    expect(internal.refTable.table_.get(store2.values)?.get("3")?.has(observer1)).toBe(true);
    expect(internal.refTable.reverseTable_.get(observer1)?.get(store1)?.has("index")).toBe(true);
    expect(internal.refTable.reverseTable_.get(observer1)?.get(store2)?.has("values")).toBe(true);
    expect(internal.refTable.reverseTable_.get(observer1)?.get(store2.values)?.has("1")).toBe(false);
    expect(internal.refTable.reverseTable_.get(observer1)?.get(store2.values)?.has("2")).toBe(false);
    expect(internal.refTable.reverseTable_.get(observer1)?.get(store2.values)?.has("3")).toBe(true);
  });

  it("can alter array", async () => {
    const raw = { values: ["fee", "bar", "zoo", "buzz", "woohoo"] };
    const [store, setStore] = createStore(raw);

    let value: string | null = null;
    const observer = () => { value = store.values[store.values.length - 1].slice(1) };
    createEffect(observer);
    expect(value).toBe("oohoo");

    setStore(v => { v.values = v.values.map((s, i) => s.toUpperCase() + ":" + i); });
    expect(raw.values[0]).toBe("FEE:0");

    expect(value).toBe("OOHOO:4");
  });

  it("can detect delete", async () => {
    const raw = { values: ["fee", "bar", "zoo", "buzz", "woohoo"] };
    const [store, setStore] = createStore(raw);

    let val = "";
    createEffect(() => { val = store.values[1]; });

    // biome-ignore lint/performance/noDelete: intentional. testing delete.
    setStore(v => { delete v.values[1]; });

    expect(val).toBe(undefined);
  });

  it("can be updated in nested", async () => {
    const raw = {
      last: "initial",
      values: ["fee", "bar", "zoo", "buzz", "woohoo"]
    };
    const [store, setStore] = createStore(raw);

    let val = "";
    createEffect(() => { val = store.last + store.last; });
    expect(val).toBe("initialinitial");
    createEffect(() => {
      setStore(v => v.last = store.values[store.values.length - 1]);
    });
    expect(val).toBe("woohoowoohoo");

    setStore(v => v.values.push("Append"));
    expect(store.last).toBe("Append");
    expect(val).toBe("AppendAppend");
  });

  it("does not run effects when set the identical value", async () => {
    const raw = {
      values: ["fee", "glaa", "zoo"]
    };
    const [store, setStore] = createStore(raw);

    let count = 0;
    let joined = "";
    createEffect(() => {
      count++;
      joined = store.values.join(",");
    });

    expect(count).toBe(1);
    expect(joined).toBe("fee,glaa,zoo");

    setStore(v => {
      expect(v.values[1]).toBe("glaa");
      v.values[1] = "glaa";
    });

    expect(count).toBe(1);

    setStore(v => { v.values[1] = "BAR"; });
    expect(count).toBe(2);
    expect(joined).toBe("fee,BAR,zoo");
  });

  it("cancels nested createEffect() when the parent is reevaluated.", async () => {
    const [store1, setStore1] = createStore({ x: 1 });
    const [store2, setStore2] = createStore({ y: 2 });

    let acc1 = 0;
    let acc2 = 0;
    createEffect(() => {
      acc1 += store1.x;
      createEffect(() => {
        acc2 += store2.y;
      });
    });
    expect(acc1).toBe(1);
    expect(acc2).toBe(2);

    // store2 affects inside effect only
    setStore2(s => { s.y = 3 });
    expect(acc1).toBe(1); // unchanged
    expect(acc2).toBe(5); // changed

    // store1 cancels nested effect
    setStore1(s => { s.x = 5; });
    expect(acc1).toBe(6);
    expect(acc2).toBe(8); // += 3 once by new createEffect() call

    // so changing store2 causes += 7 just once.
    setStore2(s => { s.y = 7; });
    expect(acc1).toBe(6);
    expect(acc2).toBe(15);
  });

  it("cancels nested createEffect() even if they are fired synchronously", async () => {
    const [store1, setStore1] = createStore({ x: 1, y: 2 });

    let acc1 = 0;
    let acc2 = 0;
    createEffect(() => {
      acc1 += store1.x;
      createEffect(() => {
        acc2 += store1.y;
      });
    });
    expect(acc1).toBe(1);
    expect(acc2).toBe(2);

    // modify x and then y, to fire outer effect first.
    setStore1(s => { s.x = 3; s.y = 5; });
    expect(acc1).toBe(4);
    expect(acc2).toBe(7);

    // modify y and then x, to fire inner effect first.
    setStore1(s => { s.y = 11; s.x = 13; });
    expect(acc1).toBe(17);
    expect(acc2).toBe(18);
  });

  describe("bindObserver", () => {
    it("binds a function to the surrounding effect", async () => {
      const [store, setStore] = createStore({ a: { nested: { value: 4 } } });

      const results: number[] = [];
      createEffect(() => {
        Promise.resolve().then(bindObserver(() => { results.push(store.a.nested.value); }));
      });
      const controlGroup: number[] = []; // without bindObserver()
      createEffect(() => {
        Promise.resolve().then(() => { controlGroup.push(store.a.nested.value); });
      });

      await Promise.resolve();
      expect(results).toEqual([4]); // by the first time execution
      expect(controlGroup).toEqual([4]); // ditto

      setStore(m => { m.a.nested.value += 10; });
      await Promise.resolve();
      expect(results).toEqual([4, 14]); // updated!
      expect(controlGroup).toEqual([4]); // not changed (unwantedly)
    });

    it("can be used outside of createEffect() if an observer is given", async () => {
      const [store, setStore] = createStore({ a: { nested: { value: 4 } } });

      const results: number[] = [];
      const f = () => {
        Promise.resolve().then(bindObserver(() => {
          results.push(store.a.nested.value);
        }, doSomething));
      };

      function doSomething() {
        f();
      }

      createEffect(doSomething);

      await Promise.resolve();
      expect(results).toEqual([4]); // by the first time execution

      setStore(m => { m.a.nested.value += 100; });
      await Promise.resolve();
      expect(results).toEqual([4, 104]); // updated!
    });
  });

  describe("withoutObserver", () => {
    it("prevents observer reset by parent", async () => {
      const [store, setStore] = createStore({ a: 4, b: 0 });
      const logger = createLogBuffer();

      const clear = createEffect(() => {
        logger.log("o" + store.b);
        createEffect(() => logger.log("i" + store.a));
      });

      // --- The control group ---
      expect(logger.reap()).toEqual(["o0", "i4"]);
      setStore(s => s.a++);
      expect(logger.reap()).toEqual(["i5"]);
      // kick both effects,
      setStore(s => {
        s.a++;
        s.b++;
      });
      // but only outer effect was run again: "i5" is appeared once because internal createEffect() are reset.
      expect(logger.reap()).toEqual(["o1", "i6"]);

      // --- reset ---
      clear();
      setStore(s => {
        s.a = 4;
        s.b = 0;
      });

      // --- The test target ---
      createEffect(() => {
        logger.log("o" + store.b);
        withoutObserver(() => {
          createEffect(() => logger.log("i" + store.a));
        });
      });

      expect(logger.reap()).toEqual(["o0", "i4"]);
      setStore(s => s.a++);
      expect(logger.reap()).toEqual(["i5"]);
      // kick both effects,
      setStore(s => {
        s.a++;
        s.b++;
      });
      // then the inner effect ran twice because the outer duplicates the inner.
      expect(logger.reap()).toEqual(["i6", "o1", "i6"]);
    });
  });
});
