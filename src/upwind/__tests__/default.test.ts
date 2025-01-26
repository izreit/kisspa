import { beforeEach, describe, expect, it } from "vitest";
import { defaultConditions, defaultProperties } from "../default.js";
import type { CSSRuleListLike } from "../sheet.js";
import { type Upwind, createUpwind } from "../tag.js";
import { createMockCSSGroupRuleLike } from "./mock/MockCSSGroupingRuleLike.js";

describe("default", () => {
  const el = document.createElement("div");
  let sheet: Upwind.StyleSheetLike;
  let $: Upwind;

  beforeEach(() => {
    sheet = createMockCSSGroupRuleLike("<root>");
    $ = createUpwind(sheet);
  });

  function run(...args: (string | Upwind.ExtendedDOMCSSProperties)[]): { classes: string[], rule: CSSRuleListLike } {
    el.className = $(...args)();
    const classes: string[] = [];
    // biome-ignore lint/complexity/noForEach: classList cannot be iterated?
    el.classList.forEach(c => classes.push(c));
    return { classes, rule: sheet.cssRules };
  }

  it("provides default properties", () => {
    $.extend({ properties: defaultProperties });
    const { classes, rule } = run("d:flex m:3 :hover/py:1px max-w:10");
    expect(classes).toEqual(["d:flex", "m:3", ":hover.py:1px", "max-w:10"]);
    expect(rule).toMatchObject([
      { cssText: ".d\\:flex{display: flex}" },
      { cssText: ".m\\:3{margin: 0.75rem}" },
      { cssText: ".\\:hover\\.py\\:1px:hover{padding-top: 1px;padding-bottom: 1px}" },
      { cssText: ".max-w\\:10{max-width: 2.5rem}" },
    ]);
  });

  it("provides default conditions", () => {
    $.extend({ modifiers: { conditions: defaultConditions } });
    const { classes, rule } = run("sm/margin:10px 2xl/margin:auto");
    expect(classes).toEqual(["sm.margin:10px", "2xl.margin:auto"]);
    expect(rule).toMatchObject([
      {
        conditionText: "(min-width: 640px)",
        cssRules: [
          { cssText: ".sm\\.margin\\:10px{margin: 10px}" },
        ],
      },
      {
        conditionText: "(min-width: 1536px)",
        cssRules: [
          { cssText: ".\\32 xl\\.margin\\:auto{margin: auto}" },
        ]
      }
    ]);
  });
});
