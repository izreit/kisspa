import { expect, describe, it, beforeAll, beforeEach } from "vitest";
import { createSheet, type CSSGroupingRuleLike, type Sheet } from "../sheet";

interface MockCSSGroupingRuleLike extends CSSGroupingRuleLike {
  readonly ruleText: string;
}

function createMockCSSGroupRuleLike(ruleText: string): MockCSSGroupingRuleLike {
  const rs: MockCSSGroupingRuleLike[] = [];
  return {
    ruleText,
    cssRules: rs,
    insertRule(childRuleText, index) {
      rs.splice(index, 0, createMockCSSGroupRuleLike(childRuleText));
      return index;
    },
  }
}

describe("Sheet", () => {
  let styleSheetMock: MockCSSGroupingRuleLike;
  let sheet: Sheet;
  beforeEach(() => {
    styleSheetMock = createMockCSSGroupRuleLike("<root>");
    sheet = createSheet(styleSheetMock);
  });

  it("can insert rule", () => {
    sheet.addRule_("rule1");
    expect(styleSheetMock.cssRules[0]).toMatchObject({ ruleText: "rule1" });
  });

  it("can register conditional", () => {
    sheet.registerConditional_("sm", "@media (min-width: 320px)");
    const sheetSmall = sheet.sheetFor_("sm");
    sheetSmall.addRule_(".foo { color: red }");
    expect(styleSheetMock.cssRules[0]).toMatchObject({
      cssRules: [
        { ruleText: ".foo { color: red }" }
      ],
      ruleText: "@media (min-width: 320px)",
    });
  });

  it("inserts conditionals first", () => {
    sheet.addRule_(".foo { color: blue }");

    // even the conditional is registered after the above addRule_(),
    sheet.registerConditional_("sm", "@media (min-width: 320px)");
    const sheetSmall = sheet.sheetFor_("sm");
    sheetSmall.addRule_(".foo { color: red }");

    // nesting rules inserted first.
    expect(styleSheetMock.cssRules).toMatchObject([
      {
        cssRules: [
          { ruleText: ".foo { color: red }" }
        ],
        ruleText: "@media (min-width: 320px)",
      },
      { ruleText: ".foo { color: blue }" },
    ]);
  });

  it("caches each conditionals", () => {
    sheet.addRule_(".foo { color: blue }");

    sheet.registerConditional_("sm", "@media (min-width: 320px)");
    sheet.registerConditional_("md", "@media (min-width: 640px)");

    const sheetSmall = sheet.sheetFor_("sm");
    const sheetMedium = sheet.sheetFor_("md");

    expect(sheet.sheetFor_("md")).toBe(sheetMedium);
    expect(sheet.sheetFor_("sm")).toBe(sheetSmall);
  });

  it("sorts conditionals in registered order", () => {
    sheet.addRule_(".foo { color: blue }");

    sheet.registerConditional_("sm", "@media (min-width: 320px)");
    sheet.registerConditional_("md", "@media (min-width: 640px)");

    const sheetSmall = sheet.sheetFor_("sm");
    const sheetMedium = sheet.sheetFor_("md");

    sheetSmall.addRule_(".foo { color: red }");
    sheetMedium.addRule_(".foo { color: purple }");
    sheetSmall.addRule_(".bar:hover { background: silver }");

    expect(styleSheetMock.cssRules).toMatchObject([
      {
        cssRules: [
          { ruleText: ".foo { color: red }" },
          { ruleText: ".bar:hover { background: silver }" }
        ],
        ruleText: "@media (min-width: 320px)",
      },
      {
        cssRules: [
          { ruleText: ".foo { color: purple }" },
        ],
        ruleText: "@media (min-width: 640px)",
      },
      { ruleText: ".foo { color: blue }" },
    ]);
  });

  it("can nest conditionals", () => {
    sheet.registerConditional_("sm", "@media (min-width: 320px)");
    sheet.registerConditional_("md", "@media (min-width: 640px)");
    sheet.registerConditional_("print", "@media printer");

    const sheetSmall = sheet.sheetFor_("sm");
    const sheetSmallPrinter = sheetSmall.sheetFor_("print");

    sheetSmall.addRule_(".foo { color: red }");
    sheetSmallPrinter.addRule_(".bar { background: white }");
    sheetSmall.addRule_(".bar { background: black }");

    expect(styleSheetMock.cssRules).toMatchObject([
      {
        cssRules: [
          {
            cssRules: [
              { ruleText: ".bar { background: white }" }
            ],
            ruleText: "@media printer",
          },
          { ruleText: ".foo { color: red }" },
          { ruleText: ".bar { background: black }" }
        ],
        ruleText: "@media (min-width: 320px)",
      },
    ]);
  });
});
