import { beforeEach, describe, expect, it } from "vitest";
import { createLogBuffer } from "../../html/__tests__/testutil";
import { type Tag, createTag } from "../tag";

interface MockStyleSheet extends Tag.TargetStyleSheet {
  reapInserted(): string[];
}

function createMockStyleSheet(): MockStyleSheet {
  const { log, reap } = createLogBuffer();
  return { insertRule: log, reapInserted: reap };
}

describe("tag", () => {
  const el = document.createElement("div");
  let sheet: MockStyleSheet;
  let $: Tag;

  beforeEach(() => {
    sheet = createMockStyleSheet();
    $ = createTag(sheet);
  });

  function run(src: () => string): { classes: string[], inserted: string[] } {
    el.className = src();
    const inserted = sheet.reapInserted();
    const classes: string[] = [];
    // biome-ignore lint/complexity/noForEach: classList cannot be iterated?
    el.classList.forEach(c => classes.push(c));
    return { classes, inserted };
  }

  it("handles simple declarations", () => {
    expect(run($`margin:3px text-decoration:underline`)).toEqual({
      classes: ["margin:3px", "text-decoration:underline"],
      inserted: [
        ".margin\\:3px{margin: 3px}",
        ".text-decoration\\:underline{text-decoration: underline}",
      ]
    });
  });

  it("caches/reuses declaration", () => {
    expect(run($`margin:3px text-decoration:underline`)).toEqual({
      classes: ["margin:3px", "text-decoration:underline"],
      inserted: [
        ".margin\\:3px{margin: 3px}",
        ".text-decoration\\:underline{text-decoration: underline}",
      ]
    });

    expect(run($`margin:3px`)).toEqual({
      classes: ["margin:3px"],
      inserted: [],
    });

    expect(run($`margin:3px text-decoration:underline`)).toEqual({
      classes: ["margin:3px", "text-decoration:underline"],
      inserted: [],
    });

    expect(run($`  `)).toEqual({
      classes: [],
      inserted: [],
    });
  });

  it("can have interpolated string", () => {
    expect(run($`margin-bottom:1rem ${"color:" + "black"} padding:1`)).toEqual({
      classes: ["margin-bottom:1rem", "color:black", "padding:1"],
      inserted: [
        ".margin-bottom\\:1rem{margin-bottom: 1rem}",
        ".color\\:black{color: black}",
        ".padding\\:1{padding: 0.25rem}",
      ]
    });
  });

  it("can have function", () => {
    expect(run($`margin-bottom:1rem ${() => "color:black"}`)).toEqual({
      classes: ["margin-bottom:1rem", "color:black"],
      inserted: [
        ".margin-bottom\\:1rem{margin-bottom: 1rem}",
        ".color\\:black{color: black}",
      ]
    });
  });

  it("ignores normal CSS class name", () => {
    expect(run($`margin-bottom:1rem foo color:black should-be-ignored`)).toEqual({
      classes: ["margin-bottom:1rem", "foo", "color:black", "should-be-ignored"],
      inserted: [
        ".margin-bottom\\:1rem{margin-bottom: 1rem}",
        ".color\\:black{color: black}",
      ]
    });
  });

  it("supports whitespace and udnerscore-separated values", () => {
    expect(run($`font-family:Verdana,_'"MS Gothic"'`)).toEqual({
      classes: ["font-family:Verdana,_'\"MS_Gothic\"'"],
      inserted: [
        ".font-family\\:Verdana\\,_\\'\\\"MS_Gothic\\\"\\'{font-family: Verdana, \"MS Gothic\"}",
      ]
    });
  });

  it("can specify pseudo class / :hover, :active", () => {
    expect(run($`:hover/background:red :active/padding:1px`)).toEqual({
      classes: [":hover.background:red", ":active.padding:1px"],
      inserted: [
        ".\\:hover\\.background\\:red:hover{background: red}",
        ".\\:active\\.padding\\:1px:active{padding: 1px}",
      ]
    });
  });

  it("can specify pseudo class of following sibling ~", () => {
    expect(run($`:hover_group1~/background:red`)).toEqual({
      classes: [":hover_group1~.background:red"],
      inserted: [
        ".group1:hover ~ .\\:hover_group1\\~\\.background\\:red{background: red}",
      ]
    });
  });

  it("can specify pseudo class of parnt >", () => {
    expect(run($`:hover_group1>/background:red`)).toEqual({
      classes: [":hover_group1>.background:red"],
      inserted: [
        ".group1:hover > .\\:hover_group1\\>\\.background\\:red{background: red}",
      ]
    });
  });

  it("can specify pseudo class of ancestor", () => {
    expect(run($`:hover_group1/background:red`)).toEqual({
      classes: [":hover_group1.background:red"],
      inserted: [
        ".group1:hover  .\\:hover_group1\\.background\\:red{background: red}",
      ]
    });
  });

  it("ignores unknown (whole) modifier", () => {
    expect(run($`foo/background:red`)).toEqual({
      classes: ["foo.background:red"],
      inserted: [
        ".foo\\.background\\:red{background: red}",
      ]
    });
  });

  it("can use with prefix", () => {
    $.extend({
      prefix: "pfx_",
    });
    expect(run($`background:red :disabled/border-width:4px_1px font-weight:bold`)).toEqual({
      classes: ["pfx_background:red", "pfx_:disabled.border-width:4px_1px", "pfx_font-weight:bold"],
      inserted: [
        ".pfx_background\\:red{background: red}",
        ".pfx_\\:disabled\\.border-width\\:4px_1px:disabled{border-width: 4px 1px}",
        ".pfx_font-weight\\:bold{font-weight: bold}",
      ]
    });
  });

  it("can use custom modifiers", () => {
    $.extend({
      modifiers: {
        dark: "<selector>:is(.dark *)",
        sm: "@media (min-width: 640px) { <whole> }",
      },
    });
    expect(run($`sm/background:red :disabled/border-width:4px_1px dark/font-weight:bold`)).toEqual({
      classes: ["sm.background:red", ":disabled.border-width:4px_1px", "dark.font-weight:bold"],
      inserted: [
        "@media (min-width: 640px) { .sm\\.background\\:red{background: red} }",
        ".\\:disabled\\.border-width\\:4px_1px:disabled{border-width: 4px 1px}",
        ".dark\\.font-weight\\:bold:is(.dark *){font-weight: bold}",
      ]
    });
  });

  it("can use custom modifiers with prefix", () => {
    $.extend({
      prefix: "pfx_",
      modifiers: {
        dark: "<selector>:is(.dark *)",
        sm: "@media (min-width: 640px) { <whole> }",
      },
    });
    expect(run($`sm/background:red :disabled/border-width:4px_1px dark/font-weight:bold`)).toEqual({
      classes: ["pfx_sm.background:red", "pfx_:disabled.border-width:4px_1px", "pfx_dark.font-weight:bold"],
      inserted: [
        "@media (min-width: 640px) { .pfx_sm\\.background\\:red{background: red} }",
        ".pfx_\\:disabled\\.border-width\\:4px_1px:disabled{border-width: 4px 1px}",
        ".pfx_dark\\.font-weight\\:bold:is(.dark *){font-weight: bold}",
      ]
    });
  });

  it("can custom properties", () => {
    $.extend({
      properties: {
        deco: "text-decoration",
        "m<trbl>": "margin<trbl>",
      }
    });
    expect(run($`deco:underline m:1 mb:3 :hover/mx:2px`)).toEqual({
      classes: ["deco:underline", "m:1", "mb:3", ":hover.mx:2px"],
      inserted: [
        ".deco\\:underline{text-decoration: underline}",
        ".m\\:1{margin: 0.25rem}",
        ".mb\\:3{margin-bottom: 0.75rem}",
        ".\\:hover\\.mx\\:2px:hover{margin-left: 2px;margin-right: 2px}",
      ]
    });
  });

  it("can custom number units", () => {
    $.extend({
      num: n => `${n * 10}px`
    });
    expect(run($`margin:1 padding-bottom:3`)).toEqual({
      classes: ["margin:1", "padding-bottom:3"],
      inserted: [
        ".margin\\:1{margin: 10px}",
        ".padding-bottom\\:3{padding-bottom: 30px}",
      ]
    });
  });

  it("can custom colors", () => {
    $.extend({
      colors: {
        myGray: {
          100: "#fefefe",
          200: "#cdcdcd",
        }
      }
    });
    expect(run($`color:myGray-100 background:myGray-200/50`)).toEqual({
      classes: ["color:myGray-100", "background:myGray-200/50"],
      inserted: [
        ".color\\:myGray-100{color: #fefefe}",
        ".background\\:myGray-200\\/50{background: #cdcdcd80}",
      ]
    });
  });

  it("can custom alias", () => {
    $.extend({
      properties: {
        d: "display",
      },
      aliases: {
        uline: "text-decoration:underline",
        dflex: "d:flex",
      }
    });
    expect(run($`dflex uline`)).toEqual({
      classes: ["d:flex", "text-decoration:underline"],
      inserted: [
        // order follows to `aliases` definition but not the usage ($`...`),
        // because aliases are parsed and registered in `extend()`.
        ".text-decoration\\:underline{text-decoration: underline}",
        ".d\\:flex{display: flex}",
      ]
    });
  });

  it("can register keyframes ", () => {
    $.extend({
      properties: {
        op: "opacity",
      },
      aliases: {
        opa90: "opacity:90%"
      },
      keyframes: {
        flash: "0%/op:10% to/opa90",
      },
    });
    expect(run($`animation:flash_0.8s_ease-in-out_infinite`)).toEqual({
      classes: ["animation:flash_0.8s_ease-in-out_infinite"],
      inserted: [
        ".opacity\\:90\\%{opacity: 90%}",
        "@keyframes flash {0%{opacity: 10%}to{opacity:90%}}",
        ".animation\\:flash_0\\.8s_ease-in-out_infinite{animation: flash 0.8s ease-in-out infinite}",
      ]
    });
  });
});
