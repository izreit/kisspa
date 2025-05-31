import { describe, expect, it } from "vitest";
import { arrayify, lastOf, mapCoerce } from "../core/util.js";

describe("util", () => {
  describe("arrayify", () => {
    it("makes array from an element", () => {
      expect(arrayify("")).toEqual([""]);
      expect(arrayify(0)).toEqual([0]);
    });

    it("makes empty array from nullish", () => {
      expect(arrayify(null)).toEqual([]);
      expect(arrayify(undefined)).toEqual([]);
    });

    it("returns itself for array", () => {
      const target = [{}, false, 0];
      expect(arrayify(target)).toBe(target);
    });
  });

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
