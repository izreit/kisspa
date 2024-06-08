import { observe } from "../core";
import { autorunDecimated, reaction } from "../util";

describe("util", function () {
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
      await Promise.resolve(); // wait for the promise resolution created in setStore()
      await Promise.resolve(); // Ugh! wait for the promise resolution of decimated()
      expect(results).toEqual([4, 14]); // autorun still works

      cancel();
      setStore(m => { m.a.nested.value += 10; });
      await Promise.resolve(); // wait for the promise resolution created in setStore()
      await Promise.resolve(); // Ugh! wait for the promise resolution of decimated()
      expect(results).toEqual([4, 14]); // nothing changed because already cancelled
    });
  });

  describe("reaction", () => {
    it("detects changes with watch()", async function () {
      const raw = {
        values: ["fee", "glaa", "zoo"]
      };
      const [store, setStore] = observe(raw);

      let count = 0;
      let history: [string, string | undefined] | null = null;
      reaction(() => store.values[1], (cur, prev) => {
        count++;
        history = [cur, prev];
      });

      expect(count).toBe(1);
      expect(history).toEqual(["glaa", undefined]);

      // does nothing on unrelated changes.
      setStore(s => { s.values[2] = "written"; });
      await Promise.resolve();
      expect(count).toBe(1);

      // target changes makes the watcher called.
      setStore(s => { s.values[1] = "boo"; });
      await Promise.resolve();
      expect(count).toBe(2);
      expect(history).toEqual(["boo", "glaa"]);

      // the watcher is not called unless the target is changed to a different value.
      setStore(s => { s.values[1] = "boo"; });
      await Promise.resolve();
      expect(count).toBe(2);
      expect(history).toEqual(["boo", "glaa"]);

      // indirect modifications are also notified to the watcher.
      setStore(s => { s.values.unshift("UNSHIFTED"); });
      await Promise.resolve();
      expect(count).toBe(3);
      expect(history).toEqual(["fee", "boo"]);
    });
  });
});
