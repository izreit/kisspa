import { describe, expect, it } from "vitest";
import { decimated } from "../decimated";

describe("decimated", function () {
  it("delays the wrapped function", async () => {
    let count = 0;
    const d = decimated(() => { count++; });

    d();
    expect(count).toBe(0);

    await Promise.resolve();
    expect(count).toBe(1);
  });

  it("reduces synchronous multiple calls to once", async () => {
    let count = 0;
    const d = decimated(() => { count++; });

    d();
    d();

    expect(count).toBe(0);
    await Promise.resolve();
    expect(count).toBe(1);

    d();
    d();
    d();

    expect(count).toBe(1);
    await Promise.resolve();
    expect(count).toBe(2);
  });

  it("is idempotent", async () => {
    const f = () => {};
    expect(decimated(f)).toBe(decimated(f));

    class C {
      method() {}
      boundMethod = () => {}
    }
    const v1 = new C();
    const v2 = new C();
    expect(v1.method).toBe(v2.method);
    expect(decimated(v1.method)).toBe(decimated(v2.method));
    expect(v1.boundMethod).not.toBe(v2.boundMethod);
    expect(decimated(v1.boundMethod)).not.toBe(decimated(v2.boundMethod));
  });

  it("can be disposed", async () => {
    let count = 0;
    const d = decimated(() => { count++; });

    d();
    d();

    await Promise.resolve();
    expect(count).toBe(1);

    d.dispose();
    d();
    d();

    await Promise.resolve();
    expect(count).toBe(1); // unchanged since disposed
  });
});
