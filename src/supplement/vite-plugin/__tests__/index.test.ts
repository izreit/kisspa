import { describe, expect, it } from "vitest";
import plugin from "../index.js";

describe("vite-plugin", () => {
  it("transforms component (Foo.tsx)", () => {
    const { name, transform } = plugin();
    expect(name).toBe("kisspa/hmr");
    const transformed = (
      typeof transform === "function" &&
      transform.call(null as any, "foo", "some/Foo.tsx", {}) // Ugh! null must be TransformPluginContext but hard to prepare and unused in this plugin...
    );
    expect(typeof transformed).toBe("string"); // Ugh! What can be tested?
  });

  it("doesn't transform non-component (Foo.ts)", () => {
    const { name, transform } = plugin();
    expect(name).toBe("kisspa/hmr");
    const transformed = (
      typeof transform === "function" &&
      transform.call(null as any, "foo", "some/Foo.ts", {})
    );
    expect(transformed).toBe("foo"); // returns itself
  });
});
