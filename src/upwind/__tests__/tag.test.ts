import { beforeEach, describe, expect, it } from "vitest";
import type { CSSRuleListLike } from "../sheet.js";
import { createUpwind, type Upwind } from "../tag.js";
import { createMockCSSGroupRuleLike } from "./mock/MockCSSGroupingRuleLike.js";

describe("tag", () => {
  const el = document.createElement("div");
  let sheet: Upwind.StyleSheetLike;
  let $: Upwind;

  beforeEach(() => {
    sheet = createMockCSSGroupRuleLike("<root>");
    $ = createUpwind(sheet);
  });

  function makeTestFun(...args: Parameters<Upwind>): () => { classes: string[], rule: CSSRuleListLike } {
    const fun = $(...args);
    return () => {
      el.className = fun();
      const classes: string[] = [];
      el.classList.forEach(c => classes.push(c));
      return { classes, rule: sheet.cssRules };
    };
  }

  function run(...args: Parameters<Upwind>): { classes: string[], rule: CSSRuleListLike } {
    return makeTestFun(...args)();
  }

  it("handles simple declarations", () => {
    const { classes, rule } = run("margin:3px text-decoration:underline");
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

    const { classes, rule } = run("margin:3px text-decoration:underline");
    expect(classes).toEqual(["margin:3px", "text-decoration:underline"]);
    expect(rule).toMatchObject(expectingRule);

    const { classes: c2, rule: r2 } = run("margin:3px")
    expect(c2).toEqual(["margin:3px"]);
    expect(r2).toMatchObject(expectingRule);

    const { classes: c3, rule: r3 } = run("margin:3px text-decoration:underline")
    expect(c3).toEqual(["margin:3px", "text-decoration:underline"]);
    expect(r3).toMatchObject(expectingRule);

    const { classes: c4, rule: r4 } = run("  ")
    expect(c4).toEqual([]);
    expect(r4).toMatchObject(expectingRule);
  });

  it("can have function that returns string", () => {
    const { classes, rule } = run("margin-bottom:1rem", () => "color:black");
    expect(classes).toEqual(["margin-bottom:1rem", "color:black"]);
    expect(rule).toMatchObject([
      { cssText: ".margin-bottom\\:1rem{margin-bottom: 1rem}" },
      { cssText: ".color\\:black{color: black}" },
    ]);
  });

  it("can have function that returns object", () => {
    const { classes, rule } = run("margin-bottom:1rem", () => ({ color: "black", background: "red" }));
    expect(classes).toEqual(["margin-bottom:1rem", "color:black", "background:red"]);
    expect(rule).toMatchObject([
      { cssText: ".margin-bottom\\:1rem{margin-bottom: 1rem}" },
      { cssText: ".color\\:black{color: black}" },
      { cssText: ".background\\:red{background: red}" },
    ]);
  });

  it("can have function in object", () => {
    const { classes, rule } = run("margin-bottom:1rem", { color: () => "black" });
    expect(classes).toEqual(["margin-bottom:1rem", "color:black"]);
    expect(rule).toMatchObject([
      { cssText: ".margin-bottom\\:1rem{margin-bottom: 1rem}" },
      { cssText: ".color\\:black{color: black}" },
    ]);
  });

  it("ignores normal CSS class name", () => {
    const { classes, rule } = run("margin-bottom:1rem foo color:black should-be-ignored")
    expect(classes).toEqual(["margin-bottom:1rem", "foo", "color:black", "should-be-ignored"]);
    expect(rule).toMatchObject([
      { cssText: ".margin-bottom\\:1rem{margin-bottom: 1rem}" },
      { cssText: ".color\\:black{color: black}" },
    ]);
  });

  it("supports whitespace and udnerscore-separated values", () => {
    const { classes, rule } = run(`font-family:Verdana,_'"MS Gothic"'`);
    expect(classes).toEqual(["font-family:Verdana,_'\"MS_Gothic\"'"]);
    expect(rule).toMatchObject([
      { cssText: ".font-family\\:Verdana\\,_\\'\\\"MS_Gothic\\\"\\'{font-family: Verdana, \"MS Gothic\"}" },
    ]);
  });

  it("can specify pseudo class / :hover, :active", () => {
    const { classes, rule } = run(":hover/background:red :active/padding:1px")
    expect(classes).toEqual([":hover.background:red", ":active.padding:1px"]);
    expect(rule).toMatchObject([
      { cssText: ".\\:hover\\.background\\:red:hover{background: red}" },
      { cssText: ".\\:active\\.padding\\:1px:active{padding: 1px}" },
    ]);
  });

  it("can specify pseudo class of following sibling ~", () => {
    const { classes, rule } = run(":hover_group1~/background:red")
    expect(classes).toEqual([":hover_group1~.background:red"]);
    expect(rule).toMatchObject([
      { cssText: ".group1:hover ~ .\\:hover_group1\\~\\.background\\:red{background: red}" },
    ]);
  });

  it("can specify pseudo class of parnt >", () => {
    const { classes, rule } = run(":hover_group1>/background:red")
    expect(classes).toEqual([":hover_group1>.background:red"]);
    expect(rule).toMatchObject([
      { cssText: ".group1:hover > .\\:hover_group1\\>\\.background\\:red{background: red}" },
    ]);
  });

  it("can specify pseudo class of ancestor", () => {
    const { classes, rule } = run(":hover_group1/background:red")
    expect(classes).toEqual([":hover_group1.background:red"]);
    expect(rule).toMatchObject([
      { cssText: ".group1:hover  .\\:hover_group1\\.background\\:red{background: red}" },
    ]);
  });

  it("ignores unknown (whole) modifier", () => {
    const { classes, rule } = run("foo/background:red")
    expect(classes).toEqual(["foo.background:red"]);
    expect(rule).toMatchObject([
      { cssText: ".foo\\.background\\:red{background: red}" },
    ]);
  });

  it("can use with prefix", () => {
    $.extend({
      prefix: "pfx_",
    });
    const { classes, rule } = run("background:red :disabled/border-width:4px_1px font-weight:bold")
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
    const { classes, rule } = run("sm/background:red :disabled/border-width:4px_1px dark/font-weight:bold")
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
    const { classes, rule } = run("sm/background:red :disabled/border-width:4px_1px dark/font-weight:bold")
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

  it("can custom properties using <trbl>", () => {
    $.extend({
      properties: {
        deco: "text-decoration",
        "m<trbl>": "margin<trbl>",
      }
    });
    const { classes, rule } = run("deco:underline m:1n mb:3n :hover/mx:2px");
    expect(classes).toEqual(["deco:underline", "m:1n", "mb:3n", ":hover.mx:2px"]);
    expect(rule).toMatchObject([
      { cssText: ".deco\\:underline{text-decoration: underline}" },
      { cssText: ".m\\:1n{margin: 0.25rem}" },
      { cssText: ".mb\\:3n{margin-bottom: 0.75rem}" },
      { cssText: ".\\:hover\\.mx\\:2px:hover{margin-left: 2px;margin-right: 2px}" },
    ]);
  });

  it("can custom properties using abbrevation", () => {
    $.extend({
      properties: {
        "<min-|max-|>w": "<>width",
      }
    });
    const { classes, rule } = run("w:10px min-w:5px max-w:20px");
    expect(classes).toEqual(["w:10px", "min-w:5px", "max-w:20px"]);
    expect(rule).toMatchObject([
      { cssText: ".w\\:10px{width: 10px}" },
      { cssText: ".min-w\\:5px{min-width: 5px}" },
      { cssText: ".max-w\\:20px{max-width: 20px}" },
    ]);
  });

  it("complete number units", () => {
    $.extend({
      num: n => `${n * 10}px`
    });
    const { classes, rule } = run("margin:2.5n padding-bottom:-0.5n")
    expect(classes).toEqual(["margin:2.5n", "padding-bottom:-0.5n"]);
    expect(rule).toMatchObject([
      { cssText: ".margin\\:2\\.5n{margin: 25px}" },
      { cssText: ".padding-bottom\\:-0\\.5n{padding-bottom: -5px}" },
    ]);
  });

  it("can custom number units", () => {
    $.extend({
      num: n => `${n * 10}px`
    });
    const { classes, rule } = run("margin:1n padding-bottom:3n")
    expect(classes).toEqual(["margin:1n", "padding-bottom:3n"]);
    expect(rule).toMatchObject([
      { cssText: ".margin\\:1n{margin: 10px}" },
      { cssText: ".padding-bottom\\:3n{padding-bottom: 30px}" },
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
    const { classes, rule } = run("color:myGray-100 background:myGray-200/50")
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
    const { classes, rule } = run("dflex uline")
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
    const { classes, rule } = run("animation:flash_0.8s_ease-in-out_infinite")
    expect(classes).toEqual(["animation:flash_0.8s_ease-in-out_infinite"]);
    expect(rule).toMatchObject([
      { cssText: ".opacity\\:90\\%{opacity: 90%}" },
      { cssText: "@keyframes flash {0%{opacity: 10%}to{opacity:90%}}" },
      { cssText: ".animation\\:flash_0\\.8s_ease-in-out_infinite{animation: flash 0.8s ease-in-out infinite}" },
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
    const { classes, rule } = run("sm/background:red :disabled/border-width:4px_1px dark/font-weight:bold")
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

  it("parses quotes in values of object-style", () => {
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
    const { classes, rule } = run({
      "font": "4n 'M+ Gothinc'",
      "sm": {
        background: "center / contain no-repeat url(\"../media/logo.svg\"), #eee 35% url('../media/quux.png')",
      },
      "dark": {
        "font-weight": "bold",
      },
    });
    expect(classes).toEqual([
      "font:4n_'M+_Gothinc'",
      "sm.background:center_/_contain_no-repeat_url(\"../media/logo.svg\"),_#eee_35%_url('../media/quux.png')",
      "dark.font-weight:bold",
    ]);
    expect(rule).toMatchObject([
      { cssText: ".font\\:4n_\\'M\\+_Gothinc\\'{font: 1rem 'M+ Gothinc'}" },
      { cssText: ".dark\\.font-weight\\:bold:is(.dark *){font-weight: bold}" },
      {
        conditionText: "(min-width: 640px)",
        cssRules: [
          {
            cssText:
              ".sm\\.background\\:center_\\/_contain_no-repeat_url\\(\\\"\\.\\.\\/media\\/logo\\.svg\\\"\\)\\,_\\#eee_35\\%_url\\(\\'\\.\\.\\/media\\/quux\\.png\\'\\){"
               + "background: center / contain no-repeat url(\"../media/logo.svg\"), #eee 35% url('../media/quux.png')"
               + "}"
          }
        ],
      },
    ]);
  });

  it("parses modifiers in object-style", () => {
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
    const { classes, rule } = run("sm/color:blue", {
      "sm": {
        background: "red",
      },
      ":disabled/dark/border-width": "4px 1px", // inline modifer in object-style
      "dark/:hover": {
        "animation": null,
        "font-weight": "bold",
      },
    });
    expect(classes).toEqual(["sm.color:blue", "sm.background:red", ":disabled.dark.border-width:4px_1px", "dark.:hover.font-weight:bold"]);
    expect(rule).toMatchObject([
      { cssText: ".\\:disabled\\.dark\\.border-width\\:4px_1px:disabled:is(.dark *){border-width: 4px 1px}" },
      { cssText: ".dark\\.\\:hover\\.font-weight\\:bold:is(.dark *):hover{font-weight: bold}" },
      {
        conditionText: "(min-width: 640px)",
        cssRules: [
           { cssText: ".sm\\.color\\:blue{color: blue}" },
           { cssText: ".sm\\.background\\:red{background: red}" },
        ],
      },
    ]);
  });

  it("accepts function in object-style", () => {
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

    const stateLike = { bg: "silver" };
    const runTest = makeTestFun("sm/color:blue", {
      "sm": {
        background: () => stateLike.bg,
      },
    });

    const { classes, rule } = runTest();
    expect(classes).toEqual(["sm.color:blue", "sm.background:silver"]);
    expect(rule).toMatchObject([
      {
        conditionText: "(min-width: 640px)",
        cssRules: [
           { cssText: ".sm\\.color\\:blue{color: blue}" },
           { cssText: ".sm\\.background\\:silver{background: silver}" },
        ],
      },
    ]);

    stateLike.bg = "#333";
    const { classes: classes2, rule: rule2 } = runTest();
    expect(classes2).toEqual(["sm.color:blue", "sm.background:#333"]);
    expect(rule2).toMatchObject([
      {
        conditionText: "(min-width: 640px)",
        cssRules: [
           { cssText: ".sm\\.color\\:blue{color: blue}" },
           { cssText: ".sm\\.background\\:silver{background: silver}" },
           { cssText: ".sm\\.background\\:\\#333{background: #333}" },
        ],
      },
    ]);
  });
});
