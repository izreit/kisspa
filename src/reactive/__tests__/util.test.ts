import { describe, expect, it } from "vitest";
import { autorun, observe } from "../core.js";
import { autorunDecimated, memoize, signal, watchProbe } from "../util.js";
import { createLogBuffer } from "./testutil.js";

describe("util", () => {
  describe("autorunDecimated", () => {
    it("decimates function call", async () => {
      const [store, setStore] = observe({ a: { nested: { value: 4 } } });

      const results: number[] = [];
      const { fun: f, cancel } = autorunDecimated(() => {
        results.push(store.a.nested.value);
      });

      f();
      f();
      expect(results).toEqual([]);
      await Promise.resolve();
      expect(results).toEqual([4]); // decimated to call once

      setStore(m => { m.a.nested.value += 10; });
      await Promise.resolve(); // Ugh! wait for the promise resolution of decimated()
      expect(results).toEqual([4, 14]); // autorun still works

      cancel();
      setStore(m => { m.a.nested.value += 10; });
      await Promise.resolve(); // Ugh! wait for the promise resolution of decimated()
      expect(results).toEqual([4, 14]); // nothing changed because already cancelled
    });
  });

  describe("watchProbe", () => {
    it("detects changes", async () => {
      const raw = {
        values: ["fee", "glaa", "zoo"]
      };
      const [store, setStore] = observe(raw);

      let count = 0;
      let history: [string, string | undefined] | null = null;
      watchProbe(() => store.values[1], (cur, prev) => {
        count++;
        history = [cur, prev];
      });

      expect(count).toBe(1);
      expect(history).toEqual(["glaa", undefined]);

      // does nothing on unrelated changes.
      setStore(s => { s.values[2] = "written"; });
      expect(count).toBe(1);

      // target changes makes the watcher called.
      setStore(s => { s.values[1] = "boo"; });
      expect(count).toBe(2);
      expect(history).toEqual(["boo", "glaa"]);

      // the watcher is not called unless the target is changed to a different value.
      setStore(s => { s.values[1] = "boo"; });
      expect(count).toBe(2);
      expect(history).toEqual(["boo", "glaa"]);

      // indirect modifications are also notified to the watcher.
      setStore(s => { s.values.unshift("UNSHIFTED"); });
      expect(count).toBe(3);
      expect(history).toEqual(["fee", "boo"]);
    });

    it("compares by array elements", async () => {
      const raw = {
        values: ["fee", "glaa", "zoo"],
        foo: 3,
      };
      const [store, setStore] = observe(raw);

      let count = 0;
      const history: ([[string, number], [string, number] | undefined])[] = [];
      watchProbe(() => [store.values[1], store.foo] as [string, number], (cur, prev) => {
        count++;
        history.push([cur, prev]);
      });

      expect(count).toBe(1);
      expect(history).toEqual([[["glaa", 3], undefined]]);

      // unaffected by unwatched values
      setStore(s => { s.values[0] = "bee"; });
      expect(count).toBe(1);

      // affected by an element of watchProbe'ed array
      setStore(s => { s.foo = 4 });
      expect(count).toBe(2);
      expect(history).toEqual([
        [["glaa", 3], undefined],
        [["glaa", 4], ["glaa", 3]],
      ]);

      // increase ocoverage: watched properties are changed and restored synchronously
      setStore(s => { s.foo++; s.foo--; });
      expect(count).toBe(2);
    });

    it("accepts user condition", async () => {
      const raw = {
        values: ["fee", "glaa", "zoo"]
      };
      const [store, setStore] = observe(raw);

      let count = 0;
      let history: [string, string | undefined] | null = null;
      watchProbe(
        () => store.values[1],
        (cur, prev) => {
          count++;
          history = [cur, prev];
        },
        (cur, prev) => (cur.length - prev.length === 1) // only reports when the length become longer just one character.
      );
      expect(count).toBe(1);
      expect(history).toEqual(["glaa", undefined]);

      setStore(s => s.values[1] = "glaa0");
      expect(count).toBe(2);
      expect(history).toEqual(["glaa0", "glaa"]);

      setStore(s => s.values[1] = "a");
      expect(count).toBe(2); // unchanged becaue the modification doesn't satisfies the condition.

      setStore(s => s.values[1] = "ab");
      expect(count).toBe(3);
      expect(history).toEqual(["ab", "a"]); // the previous value is "a" because it's detected even not reported.
    });
  });

  describe("memoize", () => {
    it("caches the value", () => {
      const { log, reap } = createLogBuffer();
      const [sigA, setSigA] = signal(1);
      const [sigB, setSigB] = signal(1);

      const memoizedSigAx3 = memoize(() => {
        log(`A:${sigA()}`);
        return sigA() * 3;
      });
      const unmemoizedSigAx5 = () => {
        log(`B:${sigB()}`);
        return sigB() * 5;
      };

      expect(reap()).toEqual([
        "A:1",
      ]);

      autorun(() => log(`r1:${memoizedSigAx3()}`));
      autorun(() => log(`r2:${memoizedSigAx3()} ${unmemoizedSigAx5()}`));
      expect(reap()).toEqual([
        "r1:3",
        "B:1",
        "r2:3 5",
      ]);

      // memoized signal re-evaluated since its depending value `sigA` is updated.
      setSigA(2);
      expect(reap()).toEqual([
        "A:2", // so we see this log
        "r1:6",
        "B:1",
        "r2:6 5",
      ]);

       // memoized signal is not evaluated since its depending value is not changed.
      setSigB(2);
      expect(reap()).toEqual([
        "B:2",
        "r2:6 10",
      ]);
    });
  });
});
