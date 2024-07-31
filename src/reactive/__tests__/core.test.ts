import { describe, it, expect } from "vitest";
import { cloneutil } from "../cloneutil";
import { autorun, bindObserver, cancelAutorun, debugGetInternal, observe, unwatch, watchDeep, watchShallow } from "../core";
import { Key } from "../internal/reftable";

describe("microstore", function () {
  it("can be read/modified", function () {
    const [store, setStore] = observe({ foo: 4 });
    expect(store.foo).toBe(4);
    setStore(s => { s.foo *= 2 });
    expect(store.foo).toBe(8);
  });

  it("can watch a simple object", async function () {
    const internal = debugGetInternal();

    const raw = { foo: 4 };
    const [store, setStore] = observe(raw);
    expect(store.foo).toBe(4);
    expect(internal.refTable.table_.has(store)).toBe(false);
    expect(internal.memoizedTable.get(store)?.[0]).toBe(store);

    let squareFoo: number = 0;
    const observer = () => { squareFoo = store.foo ** 2; };
    autorun(observer);
    expect(store.foo).toBe(4);
    expect(squareFoo).toBe(16); // autorun() calls the observer func imidiately
    expect(internal.refTable.table_.get(store)?.get("foo")?.has(observer)).toBe(true);
    expect(internal.refTable.table_.get(store)?.get("foo")?.size).toBe(1);
    expect(internal.refTable.reverseTable_.get(observer)?.get(store)?.has("foo")).toBe(true);
    expect(internal.refTable.reverseTable_.get(observer)?.get(store)?.size).toBe(1);

    setStore(s => { s.foo *= 2; });
    expect(store.foo).toBe(8);

    expect(squareFoo).toBe(64);

    setStore(s => { s.foo = 14; });
    expect(squareFoo).toBe(196);
  });

  it("can watch array", async function () {
    const raw = [100, 20, 32, 5];
    const [store, setStore] = observe(raw);

    let val = 0;
    autorun(() => { val = store[0]; });
    expect(store[0]).toBe(100);

    setStore(v => { v.shift(); v.push(77); });
    setStore(v => { v.splice(0, 0, 45, 46); });
    expect(val).toBe(45);

    setStore(v => { v.sort((a, b) => a - b); });
    expect(val).toBe(5);
  });

  it("can watch nested values and its stractural modification", async function () {
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
    const [store, setStore] = observe(raw);

    let callCount = 0;
    let lastValue: number = Infinity;
    autorun(() => {
      callCount++;
      const a = store.table[store.activeId].values;
      lastValue = a[a.length - 1];
    });
    expect(callCount).toBe(1);
    expect(lastValue).toBe(120);

    setStore(v => { v.table["ccc"].values.push(-45); });
    expect(callCount).toBe(1);
    expect(lastValue).toBe(120);

    setStore(v => { v.activeId = "ccc"; });
    expect(callCount).toBe(2);
    expect(lastValue).toBe(-45);

    setStore(v => { v.table = { "ccc": { givenName: "Bob", values: [10001] } }; });
    expect(callCount).toBe(3);
    expect(lastValue).toBe(10001);

    setStore(v => { v.table["ccc"] = { givenName: "Alice", values: [42] }; });
    expect(callCount).toBe(4);
    expect(lastValue).toBe(42);
  });

  it("can be untracked", async function () {
    const [store, setStore] = observe({ count: 0 });

    let countClone0 = 0;
    let countClone1 = 0;
    const copyCount0 = () => { countClone0 = store.count; }
    autorun(copyCount0);
    autorun(() => { countClone1 = store.count; });

    setStore(s => { s.count += 42 });
    expect(countClone0).toBe(42);
    expect(countClone1).toBe(42);

    cancelAutorun(copyCount0);
    setStore(s => { s.count -= 10 });
    expect(countClone0).toBe(42); // now it has never been updated
    expect(countClone1).toBe(32);
  });

  it("doesn't call unrelated observers", async function () {
    const raw = [
      { firstName: "john", age: 10 },
      { firstName: "mary", age: 24 },
      { firstName: "tom", age: 32 },
      { firstName: "chris", age: 29 },
    ];
    const [store, setStore] = observe(raw);

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

    autorun(observerChris);
    autorun(observerSecond);
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

  it("can suppress synchronous flush", async function () {
    const raw = { values: ["fee", "bar", "zoo", "buzz", "woohoo"] };
    const [store, setStore] = observe(raw);

    let caps = "";
    autorun(() => { caps = store.values.map(s => s[0]).join(""); });
    expect(caps).toBe("fbzbw");

    setStore(s => { s.values[2] = "BOO"; }, { lazyFlush: true });
    expect(caps).toBe("fbzbw"); // for lazyFlush, related autorun's will not be invoked synchronously.
    await Promise.resolve();
    expect(caps).toBe("fbBbw"); // updated after async gap.

    setStore(s => { s.values.push("A"); }, { lazyFlush: true });
    expect(caps).toBe("fbBbw"); // not updated yet.
    setStore(s => { s.values.shift(); });
    expect(caps).toBe("bBbwA"); // non-lazyFlush setStore() also flush the modification
  });

  it("rejects array modification outside setter", async function () {
    const raw = [100, 20, 32, 5];
    const [store, _setStore] = observe(raw);
    expect(() => store.sort((a, b) => a - b)).toThrow((/^can't set\/delete property \d+ without setter/));
  });

  it("can watch multiple stores", async function () {
    const internal = debugGetInternal();

    const raw1 = { index: 1 };
    const raw2 = { values: ["fee", "bar", "zoo", "buzz", "woohoo"] };
    const [store1, setStore1] = observe(raw1);
    const [store2, setStore2] = observe(raw2);

    let value: string | null = null;
    const observer1 = () => { value = store2.values[store1.index].slice(1) };
    autorun(observer1);

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

  it("can alter array", async function () {
    const raw = { values: ["fee", "bar", "zoo", "buzz", "woohoo"] };
    const [store, setStore] = observe(raw);

    let value: string | null = null;
    const observer = () => { value = store.values[store.values.length - 1].slice(1) };
    autorun(observer);
    expect(value).toBe("oohoo");

    setStore(v => { v.values = v.values.map((s, i) => s.toUpperCase() + ":" + i); });
    expect(raw.values[0]).toBe("FEE:0");

    expect(value).toBe("OOHOO:4");
  });

  it("can detect delete", async function () {
    const raw = { values: ["fee", "bar", "zoo", "buzz", "woohoo"] };
    const [store, setStore] = observe(raw);

    let val: string = "";
    autorun(() => { val = store.values[1]; });

    setStore(v => { delete v.values[1]; });

    expect(val).toBe(undefined);
  });

  it("can be updated in nested", async function () {
    const raw = {
      last: "initial",
      values: ["fee", "bar", "zoo", "buzz", "woohoo"]
    };
    const [store, setStore] = observe(raw);

    let val: string = "";
    autorun(() => { val = store.last + store.last; });
    expect(val).toBe("initialinitial");
    autorun(() => {
      setStore(v => v.last = store.values[store.values.length - 1]);
    });
    expect(val).toBe("woohoowoohoo");

    setStore(v => v.values.push("Append"));
    expect(store.last).toBe("Append");
    expect(val).toBe("AppendAppend");
  });

  it("does not run effects when set the identical value", async function () {
    const raw = {
      values: ["fee", "glaa", "zoo"]
    };
    const [store, setStore] = observe(raw);

    let count = 0;
    let joined: string = "";
    autorun(() => {
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

  it("cancels nested autorun() when the parent is reevaluated.", async function () {
    const [store1, setStore1] = observe({ x: 1 });
    const [store2, setStore2] = observe({ y: 2 });

    let acc1 = 0;
    let acc2 = 0;
    autorun(() => {
      acc1 += store1.x;
      autorun(() => {
        acc2 += store2.y;
      });
    });
    expect(acc1).toBe(1);
    expect(acc2).toBe(2);

    // store2 affects inside autorun() only
    setStore2(s => { s.y = 3 });
    expect(acc1).toBe(1); // unchanged
    expect(acc2).toBe(5); // changed

    // store1 cancels nested autorun()
    setStore1(s => { s.x = 5; });
    expect(acc1).toBe(6);
    expect(acc2).toBe(8); // += 3 once by new autorun() call

    // so changing store2 causes += 7 just once.
    setStore2(s => { s.y = 7; });
    expect(acc1).toBe(6);
    expect(acc2).toBe(15);
  });

  it("cancels nested autorun() even if they are fired synchronously", async function () {
    const [store1, setStore1] = observe({ x: 1, y: 2 });

    let acc1 = 0, acc2 = 0;
    autorun(() => {
      acc1 += store1.x;
      autorun(() => {
        acc2 += store1.y;
      });
    });
    expect(acc1).toBe(1);
    expect(acc2).toBe(2);

    // modify x and then y, to fire outer autorun() first.
    setStore1(s => { s.x = 3; s.y = 5; });
    expect(acc1).toBe(4);
    expect(acc2).toBe(7);

    // modify y and then x, to fire inner autorun() first.
    setStore1(s => { s.y = 11; s.x = 13; });
    expect(acc1).toBe(17);
    expect(acc2).toBe(18);
  });

  describe("watchDeep()", () => {
    it("can watch nested properties", async function () {
      const raw = {
        values: ["fee", "glaa", "zoo"],
        anotherValue: false,
        yetAnother: 32,
        a: {
          deeply: {
            nested: {
              value: 4
            }
          }
        }
      };
      const [store, setStore] = observe(raw);

      let count = 0;
      let lastPath: readonly Key[] = [];
      let lastVal: any;
      watchDeep(store, (path, val) => {
        count++;
        lastPath = path;
        lastVal = val;
      });

      // backup
      const [anotherStore, setAnotherStore] = observe<{ val: { nested: { value: number } } }>({
        val: { nested: { value: 0 } }
      });
      setAnotherStore(a => a.val = store.a.deeply);

      // check initial condition
      expect(count).toBe(0);

      // modify shallow
      setStore(s => s.anotherValue = true);
      expect(count).toBe(1);
      expect(lastPath).toEqual(["anotherValue"]);
      expect(lastVal).toBe(true);

      // modify deep
      setStore(s => s.a.deeply = { nested: { value: 25 } });
      expect(count).toBe(2);
      expect(lastPath).toEqual(["a", "deeply"]);
      expect(lastVal).toEqual({ nested: { value: 25 } });

      // the overwritten value is still alive and watchable
      let oldValue = 0;
      autorun(() => { oldValue = anotherStore.val.nested.value; });
      expect(oldValue).toBe(4);
      setAnotherStore(a => a.val.nested.value += 3);
      expect(oldValue).toBe(7);

      // but it does not detected by watchDeep() because it is unreachable from the watchDeep() root.
      expect(count).toBe(2);

      // while new values are watched.
      setStore(s => s.a.deeply.nested.value = 33);
      expect(count).toBe(3);
      expect(lastPath).toEqual(["a", "deeply", "nested", "value"]);
      expect(lastVal).toBe(33);
    });

    it("can watch non-root of store", async function () {
      const raw = {
        values: ["fee", "glaa", "zoo"],
        anotherValue: false,
        yetAnother: 32,
        a: {
          deeply: {
            nested: {
              value: 4
            }
          }
        }
      };
      const [store, setStore] = observe(raw);

      let count = 0;
      let lastPath: readonly Key[] = [];
      let lastVal: any;
      watchDeep(store.a.deeply, (path, val) => {
        count++;
        lastPath = path;
        lastVal = val;
      });

      // does not detect outside of watch target
      setStore(s => s.anotherValue = true);
      setStore(s => s.values.push("foo"));
      expect(count).toBe(0);

      // modify shallow
      setStore(s => s.a.deeply.nested = { value: 1 });
      expect(count).toBe(1);
      expect(lastPath).toEqual(["nested"]);
      expect(lastVal).toEqual({ value: 1 });

      // detect even if the value is not changed, when the value is not notified yet
      setStore(s => s.a.deeply.nested.value = 1);
      expect(count).toBe(2);
      expect(lastPath).toEqual(["nested", "value"]);
      expect(lastVal).toBe(1);

      // once notified, non-modifying assignment will not be detected
      setStore(s => s.a.deeply.nested.value = 1);
      expect(count).toBe(2);

      // modify deep
      setStore(s => s.a.deeply.nested.value = 10);
      expect(count).toBe(3);
      expect(lastPath).toEqual(["nested", "value"]);
      expect(lastVal).toBe(10);
    });

    it("notifies multiple at once", async function () {
      const raw = {
        values: ["fee", "glaa", "zoo"],
        anotherValue: false,
        yetAnother: 32,
        a: {
          deeply: {
            nested: {
              value: 4
            }
          }
        }
      };
      const [store, setStore] = observe(raw);

      const history: { path: readonly Key[], val: any }[] = [];
      watchDeep(store, (path, val) => {
        history.push({ path, val });
      });

      setStore(s => s.a.deeply.nested = { value: 1 });
      setStore(s => s.values.pop());
      setStore(s => s.values.unshift("foo"));
      expect(history).toEqual([
        { path: ["a", "deeply", "nested"], val: { value: 1 } },
        { path: ["values", "2"], val: undefined },
        { path: ["values", "length"], val: 2 },
        { path: ["values", "2"], val: "glaa" },
        { path: ["values", "1"], val: "fee" },
        { path: ["values", "0"], val: "foo" },
        { path: ["values", "length"], val: 3 },
      ]);
    });

    it("notifies deletion", async function () {
      const raw = {
        values: ["fee", "glaa", "zoo"] as (string[] | undefined),  // type annotation to delete
        anotherValue: false,
        yetAnother: 32,
        a: {
          deeply: {
            nested: {
              value: 4
            }
          }
        }
      };
      const [store, setStore] = observe(raw);

      const history: { path: readonly Key[], val: any }[] = [];
      watchDeep(store, (path, val) => {
        history.push({ path, val });
      });

      setStore(s => s.a.deeply.nested = { value: 1 });
      setStore(s => { delete s.values![1]; });
      setStore(s => { delete s.values; });
      expect(history).toEqual([
        { path: ["a", "deeply", "nested"], val: { value: 1 } },
        { path: ["values", "1"], val: undefined },
        { path: ["values"], val: undefined },
      ]);
    });

    it("can be used to reactive clone", async function () {
      const raw = {
        table: {
          k1: { id: 10, nameKey: "john" },
          k2: { id: 11, nameKey: "mary" },
          k3: { id: 12, nameKey: "chris" }
        } as { [key: string]: { id: number, nameKey: string } },
        arr: [
          { v: "fee" },
          { v: "bee", opt: true },
        ],
        count: 1
      };
      const [store, setStore] = observe(raw);

      const c: typeof store = cloneutil.cloneDeep(store);
      watchDeep(store, (path, val, deleted) => {
        cloneutil.assign(c, path, cloneutil.cloneDeep(val), deleted);
      });

      setStore(s => {
        s.arr.push({ v: "dee" });
        s.table["A1"] = { id: 13, nameKey: "nix" };
        delete s.table["k1"];
      });
      setStore(s => { s.count++ });
      expect(c).toEqual(store);
      expect(c).toEqual({
        table: {
          k2: { id: 11, nameKey: "mary" },
          k3: { id: 12, nameKey: "chris" },
          A1: { id: 13, nameKey: "nix" },
        },
        arr: [
          { v: "fee" },
          { v: "bee", opt: true },
          { v: "dee" },
        ],
        count: 2
      });

      setStore(s => { s.arr.splice(1, 1); });
      expect(c).toEqual(store);
      expect(c).toEqual({
        table: {
          k2: { id: 11, nameKey: "mary" },
          k3: { id: 12, nameKey: "chris" },
          A1: { id: 13, nameKey: "nix" },
        },
        arr: [
          { v: "fee" },
          { v: "dee" },
        ],
        count: 2
      });
    });

    it("can deal with DAG", async function () {
      const raw1 = {
        table: {
          k1: { id: 10, nameStr: "john" },
          k2: { id: 11, nameStr: "mary" },
          k3: { id: 12, nameStr: "chris" }
        } as { [key: string]: { id: number, nameStr: string } },
      };
      const raw2 = {
        [raw1.table.k1.id]: raw1.table.k1
      };

      const [store1, setStore1] = observe(raw1);
      const [store2, setStore2] = observe(raw2);
      const clone1 = cloneutil.cloneDeep(store1);
      const clone2 = cloneutil.cloneDeep(store2);
      let count1 = 0;
      watchDeep(store1, (path, val, deleted) => {
        count1++;
        cloneutil.assign(clone1, path, cloneutil.cloneDeep(val), deleted);
      });
      let count2 = 0;
      watchDeep(store2, (path, val, deleted) => {
        count2++;
        cloneutil.assign(clone2, path, cloneutil.cloneDeep(val), deleted);
      });

      // modification of a shared value is notified to both.
      setStore2(s => { s[10].nameStr = "DEE"; });
      expect(clone1).toEqual(store1);
      expect(clone2).toEqual(store2);
      expect(count1).toBe(1);
      expect(count2).toBe(1);

      // delete is notified only store1's watcher.
      setStore1(s => { delete s.table.k1; });
      expect(clone1).toEqual(store1);
      expect(clone2).toEqual(store2);
      expect(count1).toBe(2);
      expect(count2).toBe(1); // not incremented

      // after deletion store1's watcher does not receive notification.
      setStore2(s => { s[10].nameStr = "GEE"; });
      expect(clone1).toEqual(store1);
      expect(clone2).toEqual(store2);
      expect(count1).toBe(2); // not incremented
      expect(count2).toBe(2);
    });

    it("does not reproduce a fixed bug - when modify-and-restoring a value, watchDeep() ignores restoring", async function () {
      const raw = { foo: 10 };
      const [store, setStore] = observe(raw);
      const clone = cloneutil.cloneDeep(store);
      let count = 0;
      watchDeep(store, (path, val, deleted) => {
        count++;
        cloneutil.assign(clone, path, cloneutil.cloneDeep(val), deleted);
      });

      setStore(s => { s.foo = 3; }); // modify a property,
      setStore(s => { s.foo = 10; }); // and restore the original syncronously.
      expect(clone).toEqual(store);
      expect(count).toBe(2);
    });

    it("does not reproduce a fixed bug - notifying twice", async function () {
      const raw = { p1: { p2: [] as any[] } };
      const [store, setStore] = observe(raw);
      const clone = cloneutil.cloneDeep(store);
      let count = 0;
      watchDeep(store, (path, val, deleted) => {
        count++;
        cloneutil.assign(clone, path, cloneutil.cloneDeep(val), deleted);
      });

      setStore(s => {
        s.p1 = { p2: [] };
        // The following had caused two effects: (a) updating the notified value (assigned above synchornously
        // and not yet notified) and (b) pushing a notification for assignment. The property p2 had watched doubly since
        // it watchDeep()'ed by not only (b) but also (a). Because when notified by (a), the value had already been updated.
        s.p1.p2 = [{}];
      });
      expect(clone).toEqual(store);
      expect(count).toBe(1);
    });

    it("does not reproduce a fixed bug - nested set resets writings", async function () {
      const [store, setStore] = observe({ a: 1, b: 1 });

      let ab = 1;
      let count = 0;
      autorun(() => {
        ++count;
        ab = store.a * store.b;
      });
      expect(count).toBe(1);

      setStore(s => {
        setStore(s => { s.b = 7; });
        expect(ab).toBe(7); // should be 1? (by skipping flush on nested set)
        s.a = 3;
      });
      expect(ab).toBe(21);
      expect(count).toBe(3); // should be 2? (by skipping flush on nested set)
    });
  });

  describe("unwatch() deep", () => {
    it("stops notification ", async () => {
      const raw = {
        values: ["fee", "glaa", "zoo"],
        a: {
          nested: {
            value: 4
          }
        }
      };
      const [store, setStore] = observe(raw);

      const logs: [readonly Key[], any, boolean][] = [];
      const wid = watchDeep(store, (path, val, deleted) => { logs.push([path, val, deleted]); });

      setStore((s) => { s.a.nested.value++; });
      setStore((s) => { s.values[0] = ""; });

      expect(logs).toEqual([
        [["a", "nested", "value"], 5, false],
        [["values", "0"], "", false],
      ]);

      unwatch(wid);
      setStore((s) => { s.a.nested.value++; });
      expect(logs.length).toBe(2); // nothing notified
    });
  });

  describe("watchDeep() with applyHandler", () => {
    it("can intercept unshift", async function () {
      const raw = {
        values: ["fee", "glaa", "zoo"],
        anotherValue: false,
        yetAnother: 32,
        a: {
          deeply: {
            nested: {
              value: 4
            }
          }
        }
      };
      const [store, setStore] = observe(raw);

      let setCount = 0;
      let callCount = 0;
      const clone = cloneutil.cloneDeep(store);
      watchDeep(store, {
        onAssign: (path, val, deleted) => {
          ++setCount;
          cloneutil.assign(clone, path, cloneutil.cloneDeep(val), deleted);
        },
        onApply: (path, fun, args) => {
          ++callCount;
          cloneutil.apply(clone, path, fun, cloneutil.cloneDeep(args));
        }
      });

      // non-array mutation is just set
      setStore(s => { s.a.deeply.nested = { value: 10 }; });
      expect(clone).toEqual(store);
      expect(setCount).toBe(1);
      expect(callCount).toBe(0);

      // simple assignment to array is just set
      setStore(s => { s.values[2] = "ZEE"; });
      expect(clone).toEqual(store);
      expect(setCount).toBe(2);
      expect(callCount).toBe(0);

      // index-mutation of array uses applyHandler
      setStore(s => { s.values.unshift("GAA"); });
      expect(clone).toEqual(store);
      expect(setCount).toBe(2);
      expect(callCount).toBe(1);
    });

    it("tracks indices implicitly shifted by splice()", async function () {
      const raw = { values: [{ buf: [0] }] };
      const [store, setStore] = observe(raw);

      let setCount = 0;
      let callCount = 0;
      const clone = cloneutil.cloneDeep(store);
      watchDeep(store, {
        onAssign: (path, val, deleted) => {
          ++setCount;
          cloneutil.assign(clone, path, cloneutil.cloneDeep(val), deleted);
        },
        onApply: (path, fun, args) => {
          ++callCount;
          cloneutil.apply(clone, path, fun, cloneutil.cloneDeep(args));
        }
      });

      setStore(s => s.values.splice(0, 0, { buf: [10] }));
      expect(clone).toEqual(store);
      expect(setCount).toBe(0);
      expect(callCount).toBe(1);

      setStore(s => s.values[1].buf.push(3));
      expect(setCount).toBe(0);
      expect(callCount).toBe(2);
      expect(clone).toEqual(store);
    });

    it("does not reproduce a fixed bug - calling applyHandler for unseen value (which makes duplication)", async function () {
      const raw = {
        values: {
          0: { id: 0, nums: [3] }
        } as { [id: number]: { id: number, nums: number[] }},
        anotherValue: false,
        yetAnother: 32,
      };
      const [store, setStore] = observe(raw);

      let setCount = 0;
      let callCount = 0;
      const clone = cloneutil.cloneDeep(store);
      watchDeep(store, {
        onAssign: (path, val, deleted) => {
          ++setCount;
          cloneutil.assign(clone, path, cloneutil.cloneDeep(val), deleted);
        },
        onApply: (path, fun, args) => {
          ++callCount;
          cloneutil.apply(clone, path, fun, cloneutil.cloneDeep(args));
        }
      });

      setStore(s => s.values[1] = { id: 1, nums: [] as number[] }, { lazyFlush: true });
      setStore(s => s.values[1].nums.push(5)); // this doesn't call onApply because lazyFlush makes the target value unseen for watchers.
      expect(clone).toEqual(store);
      expect(setCount).toBe(1);
      expect(callCount).toBe(0);
    });
  });

  describe("watchShallow()", () => {
    it("detects changes of its propeties", async () => {
      const { parentRefTable } = debugGetInternal();

      const raw = {
        values: ["fee", "glaa", "zoo"],
        a: {
          nested: {
            value: 4
          }
        }
      } as { [key: string]: any };

      const [store, setStore] = observe(raw);

      const logs: [Key, any, boolean][] = [];
      const wid = watchShallow(store, (prop, val, deleted) => { logs.push([prop, val, deleted]); });
      expect(parentRefTable.get(store)?.size).toBe(1);

      setStore((s) => { s.a.nested.value++; }); // not detected because it is deep mod.
      setStore((s) => { s.values[0] = ""; }); // ditto.
      setStore((s) => { s["added"] = 100; }); // detected.

      expect(logs).toEqual([
        ["added", 100, false],
      ]);

      setStore((s) => { s["added"] -= 10; }); // modifications are also detected.

      expect(logs).toEqual([
        ["added", 100, false],
        ["added", 90, false],
      ]);

      setStore((s) => { delete s["added"]; }); // delete
      expect(logs).toEqual([
        ["added", 100, false],
        ["added", 90, false],
        ["added", undefined, true],
      ]);

      unwatch(wid);
      setStore((s) => { s["added"] = 100; });
      expect(logs.length).toBe(3); // nothing is notified because unwatched

      expect(parentRefTable.has(store)).toBe(false); // no entry remains
    });
  });

  describe("bindObserver", () => {
    it("binds a function to the surrounding autorun", async () => {
      const [store, setStore] = observe({ a: { nested: { value: 4 } } });

      const results: number[] = [];
      autorun(() => {
        Promise.resolve().then(bindObserver(() => { results.push(store.a.nested.value); }));
      });
      const controlGroup: number[] = []; // without bindObserver()
      autorun(() => {
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

    it("can be used outside of autorun if an observer is given", async () => {
      const [store, setStore] = observe({ a: { nested: { value: 4 } } });

      const results: number[] = [];
      const f = () => {
        Promise.resolve().then(bindObserver(() => {
          results.push(store.a.nested.value);
        }, doSomething));
      };

      function doSomething() {
        f();
      }

      autorun(doSomething);

      await Promise.resolve();
      expect(results).toEqual([4]); // by the first time execution

      setStore(m => { m.a.nested.value += 100; });
      await Promise.resolve();
      expect(results).toEqual([4, 104]); // updated!
    });
  });
});
