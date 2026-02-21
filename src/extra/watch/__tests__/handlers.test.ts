import { describe, expect, it } from "vitest";
import { createLogBuffer } from "../../../reactive/__tests__/testutil.js";
import { createStore } from "../../../reactive/core.js";
import type { WatchHandlers } from "../../../reactive/types.js";
import { addWatchHandlers, removeWatchHandlers } from "../handlers.js";

describe("handlers", () => {
  function createLogHandlers(log: (s: string) => void, key: string): WatchHandlers {
    return {
      watches: () => {
        log(`watches(${key})`);
        return true;
      },
      flush: () => log(`flush(${key})`),
      call: () => log(`call(${key})`),
      set: (_target, prop, _val, _prev, isDelete, isCallAlternative) =>
        log(`set(${key}) ${prop.toString()} ${isDelete ? "" :"!"}del ${isCallAlternative ? "" :"!"}callalt`),
    };
  }

  it("can add/remove multiple watch handlers", async () => {
    const { log, reap } = createLogBuffer();
    const hs1 = createLogHandlers(log, "1");
    const hs2 = createLogHandlers(log, "2");
    const [_store, setStore] = createStore({ val: 10, obj: { foo: false } });

    try {
      addWatchHandlers(hs1);
      setStore(s => s.val++);

      expect(reap()).toEqual([
        "watches(1)",
        "set(1) val !del !callalt",
        "flush(1)",
      ]);

      addWatchHandlers(hs2);
      setStore(s => s.val++);
      expect(reap()).toEqual([
        "watches(1)",
        // "watches(2)", // NOTE it's enough to know that there is more than one watcher.
        "set(1) val !del !callalt",
        "set(2) val !del !callalt",
        "flush(1)",
        "flush(2)",
      ]);

      removeWatchHandlers(hs1);
      setStore(s => s.val++);
      expect(reap()).toEqual([
        "watches(2)",
        "set(2) val !del !callalt",
        "flush(2)",
      ]);
    } finally {
      removeWatchHandlers(hs1);
      removeWatchHandlers(hs2);
    }
  });

  it("ignores duplicated watch handlers", async () => {
    const { log, reap } = createLogBuffer();
    const hs1 = createLogHandlers(log, "1");
    const [_store, setStore] = createStore({ val: 10, obj: { foo: false } });

    try {
      addWatchHandlers(hs1);
      setStore(s => s.val++);

      expect(reap()).toEqual([
        "watches(1)",
        "set(1) val !del !callalt",
        "flush(1)",
      ]);

      addWatchHandlers(hs1);
      setStore(s => s.val++);
      expect(reap()).toEqual([
        "watches(1)",
        "set(1) val !del !callalt",
        "flush(1)",
      ]);
    } finally {
      removeWatchHandlers(hs1);
    }
  });
});
