import { describe, expect, it } from "vitest";
import { type Prop, deprop } from "../index.js";

describe("helpers", () => {
  describe("deprop", () => {
    it("picks the value from literal Prop", () => {
      const p: Prop<string> = "foo";
      expect(deprop(p)).toBe("foo");
    });

    it("picks the value from function Prop", () => {
      const p: Prop<string> = () => "zoo";
      expect(deprop(p)).toBe("zoo");
    });

    it("accepts nullish", () => {
      const p: Prop<string> | null = (Math.random() >= 0) ? null : (() => "zoo");
      const v = deprop(p);
      expect(v).toBe(null);
    });
  });
});
