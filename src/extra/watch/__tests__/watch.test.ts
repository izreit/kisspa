import { describe, expect, it } from "vitest";
import { createLogBuffer } from "../../../reactive/__tests__/testutil.js";
import { bindObserver, createEffect, createStore, withoutObserver } from "../../../reactive/core.js";
import type { Key } from "../../../reactive/types.js";
import * as cloneutil from "../cloneutil.js";
import { debugGetInternal, unwatch, watchDeep, watchShallow } from "../watch.js";

describe("watch", () => {
  describe("watchDeep()", () => {
    it("can watch nested properties", async () => {
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
      const [store, setStore] = createStore(raw);

      let count = 0;
      let lastPath: readonly Key[] = [];
      let lastVal: any;
      watchDeep(store, (path, val) => {
        count++;
        lastPath = path;
        lastVal = val;
      });

      // backup
      const [anotherStore, setAnotherStore] = createStore<{ val: { nested: { value: number } } }>({
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
      createEffect(() => { oldValue = anotherStore.val.nested.value; });
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

    it("can watch non-root of store", async () => {
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
      const [store, setStore] = createStore(raw);

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

    it("notifies multiple at once", async () => {
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
      const [store, setStore] = createStore(raw);

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

    it("notifies deletion", async () => {
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
      const [store, setStore] = createStore(raw);

      const history: { path: readonly Key[], val: any }[] = [];
      watchDeep(store, (path, val) => {
        history.push({ path, val });
      });

      setStore(s => s.a.deeply.nested = { value: 1 });
      // biome-ignore lint/performance/noDelete: intentional. testing delete.
      setStore(s => { delete s.values![1]; });
      // biome-ignore lint/performance/noDelete: intentional. testing delete.
      setStore(s => { delete s.values; });
      expect(history).toEqual([
        { path: ["a", "deeply", "nested"], val: { value: 1 } },
        { path: ["values", "1"], val: undefined },
        { path: ["values"], val: undefined },
      ]);
    });

    it("can be used to reactive clone", async () => {
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
      const [store, setStore] = createStore(raw);

      const c: typeof store = cloneutil.cloneDeep(store);
      watchDeep(store, (path, val, deleted) => {
        cloneutil.assign(c, path, cloneutil.cloneDeep(val), deleted);
      });

      setStore(s => {
        s.arr.push({ v: "dee" });
        s.table.A1 = { id: 13, nameKey: "nix" };
        // biome-ignore lint/performance/noDelete: intentional. testing delete.
        delete s.table.k1;
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

    it("can deal with DAG", async () => {
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

      const [store1, setStore1] = createStore(raw1);
      const [store2, setStore2] = createStore(raw2);
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
      // biome-ignore lint/performance/noDelete: intentional. testing delete.
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

    it("does not reproduce a fixed bug - when modify-and-restoring a value, watchDeep() ignores restoring", async () => {
      const raw = { foo: 10 };
      const [store, setStore] = createStore(raw);
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

    it("does not reproduce a fixed bug - notifying twice", async () => {
      const raw = { p1: { p2: [] as any[] } };
      const [store, setStore] = createStore(raw);
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

    it("does not reproduce a fixed bug - nested set resets writings", async () => {
      const [store, setStore] = createStore({ a: 1, b: 1 });

      let ab = 1;
      let count = 0;
      createEffect(() => {
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
      const [store, setStore] = createStore(raw);

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
    it("can intercept unshift", async () => {
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
      const [store, setStore] = createStore(raw);

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

    it("tracks indices implicitly shifted by splice()", async () => {
      const raw = { values: [{ buf: [0] }] };
      const [store, setStore] = createStore(raw);

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

    it("does not reproduce a fixed bug - calling applyHandler for unseen value (which makes duplication)", async () => {
      const raw = {
        values: {
          0: { id: 0, nums: [3] }
        } as { [id: number]: { id: number, nums: number[] }},
        anotherValue: false,
        yetAnother: 32,
      };
      const [store, setStore] = createStore(raw);

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

      const [store, setStore] = createStore(raw);

      const logs: [Key, any, boolean][] = [];
      const wid = watchShallow(store, (prop, val, deleted) => { logs.push([prop, val, deleted]); });
      expect(parentRefTable.get(store)?.size).toBe(1);

      setStore((s) => { s.a.nested.value++; }); // not detected because it is deep mod.
      setStore((s) => { s.values[0] = ""; }); // ditto.
      setStore((s) => { s.added = 100; }); // detected.

      expect(logs).toEqual([
        ["added", 100, false],
      ]);

      setStore((s) => { s.added -= 10; }); // modifications are also detected.

      expect(logs).toEqual([
        ["added", 100, false],
        ["added", 90, false],
      ]);

      // biome-ignore lint/performance/noDelete: intentional. testing delete.
      setStore((s) => { delete s.added; }); // delete
      expect(logs).toEqual([
        ["added", 100, false],
        ["added", 90, false],
        ["added", undefined, true],
      ]);

      unwatch(wid);
      setStore((s) => { s.added = 100; });
      expect(logs.length).toBe(3); // nothing is notified because unwatched

      expect(parentRefTable.has(store)).toBe(false); // no entry remains
    });
  });

  describe("bindObserver", () => {
    it("binds a function to the surrounding autorun", async () => {
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

    it("can be used outside of autorun if an observer is given", async () => {
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
      // kick both autorun,
      setStore(s => {
        s.a++;
        s.b++;
      });
      // but only outer autorun was run again: "i5" is appeared once because internal autorun() are reset.
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
      // kick both autorun,
      setStore(s => {
        s.a++;
        s.b++;
      });
      // then the inner autorun ran twice because the outer duplicates the inner.
      expect(logger.reap()).toEqual(["i6", "o1", "i6"]);
    });
  });
});
