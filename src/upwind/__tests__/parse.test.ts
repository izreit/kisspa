import { describe, expect, it } from "vitest";
import { parse } from "../parse";

describe("parse", () => {
  it("accepts empty", () => {
    expect(parse(" ")).toEqual({
      begin: 0,
      end: 1,
      val: [],
    });
  });

  it("parses one-word declation", () => {
    expect(parse("margin:3px")).toEqual({
      begin: 0,
      end: 10,
      val: [
        { begin: 0, end: 10, modifiers: [], name: ["margin"], value: ["3px"] },
      ],
    });
  });

  it("parses --name", () => {
    const src = "--margin:3px";
    expect(parse(src)).toEqual({
      begin: 0,
      end: src.length,
      val: [
        { begin: 0, end: src.length, modifiers: [], name: ["-", "margin"], value: ["3px"] },
      ],
    });
  });

  it("parses one-word declations", () => {
    const src = "  margin:3px \t \n background:red  ";
    expect(parse(src)).toEqual({
      begin: 2,
      end: src.length,
      val: [
        { begin: 2, end: 12, modifiers: [], name: ["margin"], value: ["3px"] },
        { begin: 17, end: 31, modifiers: [], name: ["background"], value: ["red"] },
      ],
    });
  });

  it("parses underscore-separated value", () => {
    const src = "margin:3px_2px_0_1\\_0";
    expect(parse(src)).toEqual({
      begin: 0,
      end: src.length,
      val: [
        { begin: 0, end: src.length, modifiers: [], name: ["margin"], value: ["3px", "2px", "0", "1_0"] },
      ],
    });
  });

  it("parses quoted value", () => {
    const src = "margin:'3px 2px 0 \\'0\\''";
    expect(parse(src)).toEqual({
      begin: 0,
      end: src.length,
      val: [
        { begin: 0, end: src.length, modifiers: [], name: ["margin"], value: ["3px 2px 0 '0'"] },
      ],
    });
  });

  it("parses quoted value in underscore-separated", () => {
    const src = `font-family:Verdana_'"MS Gothic"'`;
    expect(parse(src)).toEqual({
      begin: 0,
      end: src.length,
      val: [
        { begin: 0, end: src.length, modifiers: [], name: ["font", "family"], value: ["Verdana", `"MS Gothic"`] },
      ],
    });
  });

  it("parses modifier", () => {
    const src = "sm/:hover/border-top:10%";
    expect(parse(src)).toEqual({
      begin: 0,
      end: src.length,
      val: [
        {
          begin: 10,
          end: 24,
          modifiers: [
            { begin: 3, end: 9, modKey: ":hover", target: null },
            { begin: 0, end: 2, modKey: "sm", target: null },
          ],
          name: ["border", "top"],
          value: ["10%"]
        },
      ],
    });
  });

  it("parses modifier target", () => {
    const src = ":hover_group~/border-top:10%";
    expect(parse(src)).toEqual({
      begin: 0,
      end: src.length,
      val: [
        {
          begin: 14,
          end: src.length,
          modifiers: [
            { begin: 0, end: 13, modKey: ":hover", target: { name: "group", rel: "~" } },
          ],
          name: ["border", "top"],
          value: ["10%"]
        },
      ],
    });
  });

  it("parses modifier target with no rel", () => {
    const src = ":hover_group/bg:red";
    expect(parse(src)).toEqual({
      begin: 0,
      end: src.length,
      val: [
        {
          begin: 13,
          end: src.length,
          modifiers: [
            { begin: 0, end: 12, modKey: ":hover", target: { name: "group", rel: null } },
          ],
          name: ["bg"],
          value: ["red"]
        },
      ],
    });
  });

  it("parses grouped modifier", () => {
    const src = "sm/:hover/{border-top:10% color:red} padding:1px";
    expect(parse(src)).toEqual({
      begin: 0,
      end: src.length,
      val: [
        {
          begin: 11,
          end: 25,
          modifiers: [
            { begin: 3, end: 9, modKey: ":hover", target: null },
            { begin: 0, end: 2, modKey: "sm", target: null },
          ],
          name: ["border", "top"],
          value: ["10%"]
        },
        {
          begin: 26,
          end: 35,
          modifiers: [
            { begin: 3, end: 9, modKey: ":hover", target: null },
            { begin: 0, end: 2, modKey: "sm", target: null },
          ],
          name: ["color"],
          value: ["red"]
        },
        {
          begin: 37,
          end: 48,
          modifiers: [],
          name: ["padding"],
          value: ["1px"]
        },
      ],
    });
  });

  it("passes through a normal classname", () => {
    const src = "m:1 ordinally-classname";
    expect(parse(src)).toEqual({
      begin: 0,
      end: src.length,
      val: [
        { begin: 0, end: 3, modifiers: [], name: ["m"], value: ["1"] },
        { begin: 4, end: src.length, modifiers: [], name: ["ordinally", "classname"], value: null },
      ],
    });
  });

  it("skips invalid valid", () => {
    const src = "m: p:2";
    expect(parse(src)).toEqual({
      begin: 0,
      end: src.length,
      val: [
        { begin: 3, end: 6, modifiers: [], name: ["p"], value: ["2"] },
      ],
    });
  });

  it("skips invalid modifier target", () => {
    const src = "sm/text-decoration:auto :hover_/m:1 p:1";
    expect(parse(src)).toEqual({
      begin: 0,
      end: 39,
      val: [
        {
          begin: 3,
          end: 23,
          modifiers: [{ begin: 0, end: 2, modKey: "sm", target: null }],
          name: ["text", "decoration"],
          value: ["auto"]
        },
        { begin: 36, end: src.length, modifiers: [], name: ["p"], value: ["1"] },
      ],
    });
  });

  it("accepts invalid name that ends with '-'", () => {
    const src = "text-:auto";
    expect(parse(src)).toEqual({
      begin: 0,
      end: src.length,
      val: [
        { begin: 0, end: src.length, modifiers: [], name: ["text", ""], value: ["auto"] },
      ],
    });
  });

  it("skips non-terminated group", () => {
    const src = "p:3 :active/{d:flex";
    expect(parse(src)).toEqual({
      begin: 0,
      end: src.length,
      val: [
        { begin: 0, end: 3, modifiers: [], name: ["p"], value: ["3"] },
      ],
    });
  });
});
