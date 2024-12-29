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
    expect(styleSheetMock.cssRules[0]).toMatchObject({ ruleTextSpy: "rule1" });
  });

  it("can register conditional", () => {
    sheet.registerConditional_("sm", "@media (min-width: 320px)");
    const sheetSmall = sheet.sheetFor_("sm");
    sheetSmall.addRule_(".foo { color: red }");
    expect(styleSheetMock.cssRules[0]).toMatchObject({
      cssRules: [
        { ruleTextSpy: ".foo { color: red }" }
      ],
      ruleTextSpy: "@media (min-width: 320px)",
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
          { ruleTextSpy: ".foo { color: red }" }
        ],
        ruleTextSpy: "@media (min-width: 320px)",
      },
      { ruleTextSpy: ".foo { color: blue }" },
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
          { ruleTextSpy: ".foo { color: red }" },
          { ruleTextSpy: ".bar:hover { background: silver }" }
        ],
        ruleTextSpy: "@media (min-width: 320px)",
      },
      {
        cssRules: [
          { ruleTextSpy: ".foo { color: purple }" },
        ],
        ruleTextSpy: "@media (min-width: 640px)",
      },
      { ruleTextSpy: ".foo { color: blue }" },
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
              { ruleTextSpy: ".bar { background: white }" }
            ],
            ruleTextSpy: "@media printer",
          },
          { ruleTextSpy: ".foo { color: red }" },
          { ruleTextSpy: ".bar { background: black }" }
        ],
        ruleTextSpy: "@media (min-width: 320px)",
      },
    ]);
  });
});
