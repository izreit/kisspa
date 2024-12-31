import { beforeEach, describe, expect, it } from "vitest";
import { type Sheet, createSheet } from "../sheet";
import { type MockCSSGroupingRuleLike, createMockCSSGroupRuleLike } from "./mock/MockCSSGroupingRuleLike";

describe("Sheet", () => {
  let styleSheetMock: MockCSSGroupingRuleLike;
  let sheet: Sheet;
  beforeEach(() => {
    styleSheetMock = createMockCSSGroupRuleLike("<root>");
    sheet = createSheet(styleSheetMock);
  });

  it("can insert rule", () => {
    sheet.addRule_("rule1");
    expect(styleSheetMock.cssRules[0]).toMatchObject({ cssText: "rule1" });
  });

  it("can register conditional", () => {
    sheet.registerConditional_("sm", "@media (min-width: 320px)");
    const sheetSmall = sheet.sheetFor_("sm");
    sheetSmall.addRule_(".foo { color: red }");
    expect(styleSheetMock.cssRules[0]).toMatchObject({
      cssRules: [
        { cssText: ".foo { color: red }" }
      ],
      conditionText: "(min-width: 320px)",
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
          { cssText: ".foo { color: red }" }
        ],
        conditionText: "(min-width: 320px)",
      },
      { cssText: ".foo { color: blue }" },
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
          { cssText: ".foo { color: red }" },
          { cssText: ".bar:hover { background: silver }" }
        ],
        conditionText: "(min-width: 320px)",
      },
      {
        cssRules: [
          { cssText: ".foo { color: purple }" },
        ],
        conditionText: "(min-width: 640px)",
      },
      { cssText: ".foo { color: blue }" },
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
              { cssText: ".bar { background: white }" }
            ],
            conditionText: "printer",
          },
          { cssText: ".foo { color: red }" },
          { cssText: ".bar { background: black }" }
        ],
        conditionText: "(min-width: 320px)",
      },
    ]);
  });
});
