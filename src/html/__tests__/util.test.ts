import { describe, expect, it } from "vitest";
import { lastOf, mapCoerce } from "../core/util.js";

describe("util", () => {
  describe("lastOf", () => {
    it("works on non-empty array", () => {
      expect(lastOf([3, 5, 100])).toBe(100);
    });
    it("returns null for empty array", () => {
      expect(lastOf([])).toBe(null);
    });
  });

  describe("mapCoerce", () => {
    it("accepts an element", () => {
      expect(mapCoerce(3, v => "square:" + v ** 2)).toEqual(["square:9"]);
      expect(mapCoerce("", v => v.length)).toEqual([0]);
    });

    it("just maps for an array", () => {
      expect(mapCoerce([3, 2], v => "square:" + v ** 2)).toEqual(["square:9", "square:4"]);
      expect(mapCoerce([], () => expect.fail("never called"))).toEqual([]);
    });

    it("returns empty array for nullish", () => {
      expect(mapCoerce(null, () => expect.fail("never called"))).toEqual([]);
      expect(mapCoerce(undefined, () => expect.fail("never called"))).toEqual([]);
    });
  });
});
