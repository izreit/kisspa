import { beforeEach, describe, expect, it } from "vitest";
import { defaultConditions, defaultProperties } from "../default";
import type { CSSRuleListLike } from "../sheet";
import { type Tag, createTag } from "../tag";
import { createMockCSSGroupRuleLike } from "./mock/MockCSSGroupingRuleLike";

describe("default", () => {
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

  it("provides default properties", () => {
    $.extend({ properties: defaultProperties });
    const { classes, rule } = run($`d:flex m:3 :hover/py:1px max-w:10`);
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
    const { classes, rule } = run($`sm/margin:10px 2xl/margin:auto`);
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
