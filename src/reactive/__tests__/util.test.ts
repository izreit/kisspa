import { describe, expect, it } from "vitest";
import { observe } from "../core";
import { autorunDecimated, watchProbe } from "../util";

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
  });
});
