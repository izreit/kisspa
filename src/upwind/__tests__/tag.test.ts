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
    el.className = src().trim();
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

  it("can specify pseudo class / :is()", () => {
    expect(run($`:hover_group1/background:red`)).toEqual({
      classes: [":hover_group1.background:red"],
      inserted: [
        ".group1:hover  .\\:hover_group1\\.background\\:red{background: red}",
      ]
    });
  });
});
