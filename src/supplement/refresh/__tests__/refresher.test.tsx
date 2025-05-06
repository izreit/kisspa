import { describe, expect, it } from "vitest";
import { h } from "../../../html/h.js";
import { createSimpleBacking } from "../../../html/core/assemble.js";
import type { Backing } from "../../../html/core/types.js";
import { createRefresher, type ProxyBacking } from "../refresher.js";

function createCreateMockBacking(): (name: string) => Backing {
  let count = 0;

  return function createMockBacking(name: string): Backing {
    return {
      ...createSimpleBacking("MockBacking"),
      name: `Mock(${name}/${count++})`,
    };
  }
}

function extractProxied(b: Backing): Backing | undefined {
  return (b as unknown as ProxyBacking).getTarget?.();
}

describe("createRefresher()", () => {
  const Comp1 = () => <p>1</p>;
  const Comp2 = () => <p>2</p>;
  const Comp3 = () => <p>3</p>;
  const FooA = () => <p>A</p>;

  it("resolves registered", () => {
    const r = createRefresher();
    r.register(Comp1, "test");
    expect(r.resolve(Comp1)).toBe(Comp1);
    r.register(Comp2, "test");
    expect(r.resolve(Comp1)).toBe(Comp2);
    expect(r.resolve(Comp2)).toBe(Comp2);
  });

  it("tracks assembled and replaces them by register", () => {
    const createMockBacking = createCreateMockBacking();
    const r = createRefresher();

    // register Comp1
    r.register(Comp1, "Comp");

    // assemble Comp1
    const c1a = r.resolve(Comp1);
    expect(c1a).toBe(Comp1);
    const b1a = createMockBacking(c1a.name);
    expect(b1a.name).toBe("Mock(Comp1/0)");
    const w1a = r.track(c1a, b1a, c => createMockBacking(c.name));
    expect(w1a.name).toBe("Proxy");
    expect(w1a.tail()).toEqual([undefined, undefined]);
    expect(extractProxied(w1a)).toBe(b1a);

    // assemble Comp1 again
    const c1b = r.resolve(Comp1);
    expect(c1b).toBe(Comp1);
    const b1b = createMockBacking(c1b.name);
    expect(b1b.name).toBe("Mock(Comp1/1)");
    const w1b = r.track(c1b, b1b, c => createMockBacking(c.name));
    expect(w1b.name).toBe("Proxy");
    expect(w1b.tail()).toEqual([undefined, undefined]);
    expect(extractProxied(w1b)).toBe(b1b);

    // dispose first Comp1
    w1a.dispose();

    // second register
    r.register(Comp2, "Comp");
    expect(extractProxied(w1a)).toBeNull();
    expect(extractProxied(w1b)?.name).toBe("Mock(Comp2/2)");

    // assembling Comp1 now redirected to Comp2
    const c1c = r.resolve(Comp1);
    expect(c1c).toBe(Comp2);
    const b1c = createMockBacking(c1c.name);
    expect(b1c.name).toBe("Mock(Comp2/3)");
    const w1c = r.track(c1c, b1c, c => createMockBacking(c.name));
    expect(w1c.name).toBe("Proxy");
    expect(w1c.tail()).toEqual([undefined, undefined]);
    expect(extractProxied(w1c)).toBe(b1c);

    // third register
    r.register(Comp3, "Comp");
    expect(extractProxied(w1a)).toBeNull();
    expect(extractProxied(w1b)?.name).toBe("Mock(Comp3/4)");
    expect(extractProxied(w1c)?.name).toBe("Mock(Comp3/5)");

    // registering different family causes nothing
    r.register(FooA, "Foo");
    expect(extractProxied(w1a)).toBeNull();
    expect(extractProxied(w1b)?.name).toBe("Mock(Comp3/4)");
    expect(extractProxied(w1c)?.name).toBe("Mock(Comp3/5)");

    // confirm nothing happens (just for coverage...)
    w1c.insert(null);
    w1a.dispose();
    (w1a as ProxyBacking).replaceTarget(createMockBacking(""));
  });

  it("resolves non-registered (never happens; just for coverage)", () => {
    const r = createRefresher();
    expect(r.resolve(FooA)).toBe(FooA);
  });

  it("do nothing for tracking non-registered (never happens; just for coverage)", () => {
    const createMockBacking = createCreateMockBacking();
    const r = createRefresher();

    const b1 = createMockBacking(FooA.name);
    expect(b1.name).toBe("Mock(FooA/0)");
    const w1 = r.track(FooA, b1, c => createMockBacking(c.name));
    expect(b1).toBe(w1);
  });
});
