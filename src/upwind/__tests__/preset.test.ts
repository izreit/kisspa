import { beforeEach, describe, expect, it } from "vitest";
import { presetColors } from "../preset/colors.js";
import type { CSSRuleListLike } from "../sheet.js";
import { type Upwind, createUpwind } from "../tag.js";
import { createMockCSSGroupRuleLike } from "./mock/MockCSSGroupingRuleLike.js";

describe("tag", () => {
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

  it("provides tailwind-compatible color names", () => {
    $.extend({ colors: presetColors });
    const { classes, rule } = run("background:sky-500 color:neutral-50");
    expect(classes).toEqual(["background:sky-500", "color:neutral-50"]);
    expect(rule).toMatchObject([
      { cssText: ".background\\:sky-500{background: #0ea5e9}" },
      { cssText: ".color\\:neutral-50{color: #fafafa}" },
    ]);
  });
});

