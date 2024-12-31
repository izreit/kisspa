import { beforeEach, describe, expect, it } from "vitest";
import type { CSSRuleListLike } from "../sheet";
import { type Tag, createTag } from "../tag";
import { createMockCSSGroupRuleLike } from "./mock/MockCSSGroupingRuleLike";

describe("tag", () => {
  const el = document.createElement("div");
  let sheet: Tag.StyleSheetLike;
  let $: Tag;

  beforeEach(() => {
    sheet = createMockCSSGroupRuleLike("<root>");
    $ = createTag(sheet);
  });

  function run(src: () => string): { classes: string[], rule: CSSRuleListLike } {
    el.className = src();
    const classes: string[] = [];
    // biome-ignore lint/complexity/noForEach: classList cannot be iterated?
    el.classList.forEach(c => classes.push(c));
    return { classes, rule: sheet.cssRules };
  }

  it("handles simple declarations", () => {
    const { classes, rule } = run($`margin:3px text-decoration:underline`)
    expect(classes).toEqual(["margin:3px", "text-decoration:underline"]);
    expect(rule).toMatchObject([
      { cssText: ".margin\\:3px{margin: 3px}" },
      { cssText: ".text-decoration\\:underline{text-decoration: underline}" },
    ]);
  });

  it("caches/reuses declaration", () => {
    const expectingRule = [
      { cssText: ".margin\\:3px{margin: 3px}" },
      { cssText: ".text-decoration\\:underline{text-decoration: underline}" },
    ] as const;

    const { classes, rule } = run($`margin:3px text-decoration:underline`);
    expect(classes).toEqual(["margin:3px", "text-decoration:underline"]);
    expect(rule).toMatchObject(expectingRule);

    const { classes: c2, rule: r2 } = run($`margin:3px`)
    expect(c2).toEqual(["margin:3px"]);
    expect(r2).toMatchObject(expectingRule);

    const { classes: c3, rule: r3 } = run($`margin:3px text-decoration:underline`)
    expect(c3).toEqual(["margin:3px", "text-decoration:underline"]);
    expect(r3).toMatchObject(expectingRule);

    const { classes: c4, rule: r4 } = run($`  `)
    expect(c4).toEqual([]);
    expect(r4).toMatchObject(expectingRule);
  });

  it("can have interpolated string", () => {
    const { classes, rule } = run($`margin-bottom:1rem ${"color:" + "black"} padding:1`);
    expect(classes).toEqual(["margin-bottom:1rem", "color:black", "padding:1"]);
    expect(rule).toMatchObject([
      { cssText: ".margin-bottom\\:1rem{margin-bottom: 1rem}" },
      { cssText: ".color\\:black{color: black}" },
      { cssText: ".padding\\:1{padding: 0.25rem}" },
    ]);
  });

  it("can have function", () => {
    const { classes, rule } = run($`margin-bottom:1rem ${() => "color:black"}`)
    expect(classes).toEqual(["margin-bottom:1rem", "color:black"]);
    expect(rule).toMatchObject([
      { cssText: ".margin-bottom\\:1rem{margin-bottom: 1rem}" },
      { cssText: ".color\\:black{color: black}" },
    ]);
  });

  it("ignores normal CSS class name", () => {
    const { classes, rule } = run($`margin-bottom:1rem foo color:black should-be-ignored`)
    expect(classes).toEqual(["margin-bottom:1rem", "foo", "color:black", "should-be-ignored"]);
    expect(rule).toMatchObject([
      { cssText: ".margin-bottom\\:1rem{margin-bottom: 1rem}" },
      { cssText: ".color\\:black{color: black}" },
    ]);
  });

  it("supports whitespace and udnerscore-separated values", () => {
    const { classes, rule } = run($`font-family:Verdana,_'"MS Gothic"'`)
    expect(classes).toEqual(["font-family:Verdana,_'\"MS_Gothic\"'"]);
    expect(rule).toMatchObject([
      { cssText: ".font-family\\:Verdana\\,_\\'\\\"MS_Gothic\\\"\\'{font-family: Verdana, \"MS Gothic\"}" },
    ]);
  });

  it("can specify pseudo class / :hover, :active", () => {
    const { classes, rule } = run($`:hover/background:red :active/padding:1px`)
    expect(classes).toEqual([":hover.background:red", ":active.padding:1px"]);
    expect(rule).toMatchObject([
      { cssText: ".\\:hover\\.background\\:red:hover{background: red}" },
      { cssText: ".\\:active\\.padding\\:1px:active{padding: 1px}" },
    ]);
  });

  it("can specify pseudo class of following sibling ~", () => {
    const { classes, rule } = run($`:hover_group1~/background:red`)
    expect(classes).toEqual([":hover_group1~.background:red"]);
    expect(rule).toMatchObject([
      { cssText: ".group1:hover ~ .\\:hover_group1\\~\\.background\\:red{background: red}" },
    ]);
  });

  it("can specify pseudo class of parnt >", () => {
    const { classes, rule } = run($`:hover_group1>/background:red`)
    expect(classes).toEqual([":hover_group1>.background:red"]);
    expect(rule).toMatchObject([
      { cssText: ".group1:hover > .\\:hover_group1\\>\\.background\\:red{background: red}" },
    ]);
  });

  it("can specify pseudo class of ancestor", () => {
    const { classes, rule } = run($`:hover_group1/background:red`)
    expect(classes).toEqual([":hover_group1.background:red"]);
    expect(rule).toMatchObject([
      { cssText: ".group1:hover  .\\:hover_group1\\.background\\:red{background: red}" },
    ]);
  });

  it("ignores unknown (whole) modifier", () => {
    const { classes, rule } = run($`foo/background:red`)
    expect(classes).toEqual(["foo.background:red"]);
    expect(rule).toMatchObject([
      { cssText: ".foo\\.background\\:red{background: red}" },
    ]);
  });

  it("can use with prefix", () => {
    $.extend({
      prefix: "pfx_",
    });
    const { classes, rule } = run($`background:red :disabled/border-width:4px_1px font-weight:bold`)
    expect(classes).toEqual(["pfx_background:red", "pfx_:disabled.border-width:4px_1px", "pfx_font-weight:bold"]);
    expect(rule).toMatchObject([
      { cssText: ".pfx_background\\:red{background: red}" },
      { cssText: ".pfx_\\:disabled\\.border-width\\:4px_1px:disabled{border-width: 4px 1px}" },
      { cssText: ".pfx_font-weight\\:bold{font-weight: bold}" },
    ]);
  });

  it("can use custom modifiers", () => {
    $.extend({
      modifiers: {
        conditions: {
          sm: "@media (min-width: 640px)",
        },
        selectors: {
          dark: ":is(.dark *)",
        },
      },
    });
    const { classes, rule } = run($`sm/background:red :disabled/border-width:4px_1px dark/font-weight:bold`)
    expect(classes).toEqual(["sm.background:red", ":disabled.border-width:4px_1px", "dark.font-weight:bold"]);
    expect(rule).toMatchObject([
      { cssText: ".\\:disabled\\.border-width\\:4px_1px:disabled{border-width: 4px 1px}" },
      { cssText: ".dark\\.font-weight\\:bold:is(.dark *){font-weight: bold}" },
      {
        conditionText: "(min-width: 640px)",
        cssRules: [
           { cssText: ".sm\\.background\\:red{background: red}" },
        ],
      },
    ]);
  });

  it("can use custom modifiers with prefix", () => {
    $.extend({
      prefix: "pfx_",
      modifiers: {
        conditions: {
          sm: "@media (min-width: 640px)",
        },
        selectors: {
          dark: ":is(.dark *)",
        },
      },
    });
    const { classes, rule } = run($`sm/background:red :disabled/border-width:4px_1px dark/font-weight:bold`)
    expect(classes).toEqual(["pfx_sm.background:red", "pfx_:disabled.border-width:4px_1px", "pfx_dark.font-weight:bold"]);
    expect(rule).toMatchObject([
      { cssText: ".pfx_\\:disabled\\.border-width\\:4px_1px:disabled{border-width: 4px 1px}" },
      { cssText: ".pfx_dark\\.font-weight\\:bold:is(.dark *){font-weight: bold}" },
      {
        conditionText: "(min-width: 640px)",
        cssRules: [
           { cssText: ".pfx_sm\\.background\\:red{background: red}" },
        ],
      },
    ]);
  });

  it("can custom properties", () => {
    $.extend({
      properties: {
        deco: "text-decoration",
        "m<trbl>": "margin<trbl>",
      }
    });
    const { classes, rule } = run($`deco:underline m:1 mb:3 :hover/mx:2px`)
    expect(classes).toEqual(["deco:underline", "m:1", "mb:3", ":hover.mx:2px"]);
    expect(rule).toMatchObject([
      { cssText: ".deco\\:underline{text-decoration: underline}" },
      { cssText: ".m\\:1{margin: 0.25rem}" },
      { cssText: ".mb\\:3{margin-bottom: 0.75rem}" },
      { cssText: ".\\:hover\\.mx\\:2px:hover{margin-left: 2px;margin-right: 2px}" },
    ]);
  });

  it("can custom number units", () => {
    $.extend({
      num: n => `${n * 10}px`
    });
    const { classes, rule } = run($`margin:1 padding-bottom:3`)
    expect(classes).toEqual(["margin:1", "padding-bottom:3"]);
    expect(rule).toMatchObject([
      { cssText: ".margin\\:1{margin: 10px}" },
      { cssText: ".padding-bottom\\:3{padding-bottom: 30px}" },
    ]);
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
    const { classes, rule } = run($`color:myGray-100 background:myGray-200/50`)
    expect(classes).toEqual(["color:myGray-100", "background:myGray-200/50"]);
    expect(rule).toMatchObject([
      { cssText: ".color\\:myGray-100{color: #fefefe}" },
      { cssText: ".background\\:myGray-200\\/50{background: #cdcdcd80}" },
    ]);
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
    const { classes, rule } = run($`dflex uline`)
    expect(classes).toEqual(["d:flex", "text-decoration:underline"]);
    expect(rule).toMatchObject([
      // order follows to `aliases` definition but not the usage ($`...`),
      // because aliases are parsed and registered in `extend()`.
      { cssText: ".text-decoration\\:underline{text-decoration: underline}" },
      { cssText: ".d\\:flex{display: flex}" },
    ]);
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
    const { classes, rule } = run($`animation:flash_0.8s_ease-in-out_infinite`)
    expect(classes).toEqual(["animation:flash_0.8s_ease-in-out_infinite"]);
    expect(rule).toMatchObject([
      { cssText: ".opacity\\:90\\%{opacity: 90%}" },
      { cssText: "@keyframes flash {0%{opacity: 10%}to{opacity:90%}}" },
      { cssText: ".animation\\:flash_0\\.8s_ease-in-out_infinite{animation: flash 0.8s ease-in-out infinite}" },
    ]);
  });
});
