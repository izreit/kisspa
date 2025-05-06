import { describe, expect, it } from "vitest";
import { nameCandidatesOf } from "../util.js";

describe("util", () => {
  describe("nameCandidatesOf()", () => {
    function testcase(filename: string, expected: string[]): void {
      it(`handles ${JSON.stringify(filename)}`, () => {
        expect(nameCandidatesOf(filename)).toEqual(expected);
      });
    }

    testcase("foo", ["Foo"]);
    testcase("Foo-Bar", ["FooBar"]);
    testcase("foo-bar-zoo", ["FooBarZoo"]);
    testcase("foo-123-zoo", ["Foo123Zoo"]);
    testcase("foo_bar", ["Foo_bar", "Foo_Bar", "FooBar", "Foobar"]);
    testcase("foo_bar_zoo", ["Foo_bar_zoo", "Foo_Bar_Zoo", "FooBarZoo", "Foobarzoo"]);
    testcase("foo_bar_123", ["Foo_bar_123", "Foo_Bar_123", "FooBar123", "Foobar123"]);

    testcase("01foo23abc", ["Foo23abc"]);
    testcase("foo.bar-zoo", ["FoobarZoo"]);
    testcase("foo+bar+zoo", ["Foobarzoo"]);
  });
});
