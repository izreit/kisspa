import { beforeEach, describe, expect, it } from "vitest";
import { presetColors } from "../preset/colors";
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

  it("provides tailwind-compatible color names", () => {
    $.extend({ colors: presetColors });
    const { classes, rule } = run($`background:sky-500 color:neutral-50`);
    expect(classes).toEqual(["background:sky-500", "color:neutral-50"]);
    expect(rule).toMatchObject([
      { cssText: ".background\\:sky-500{background: #0ea5e9}" },
      { cssText: ".color\\:neutral-50{color: #fafafa}" },
    ]);
  });
});

