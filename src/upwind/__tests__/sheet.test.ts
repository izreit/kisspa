import { beforeEach, describe, expect, it } from "vitest";
import { type RootSheet, createRootSheet } from "../sheet";
import { type MockCSSGroupingRuleLike, createMockCSSGroupRuleLike } from "./mock/MockCSSGroupingRuleLike";

describe("Sheet", () => {
  let styleSheetMock: MockCSSGroupingRuleLike;
  let sheet: RootSheet;
  beforeEach(() => {
    styleSheetMock = createMockCSSGroupRuleLike("<root>");
    sheet = createRootSheet(styleSheetMock);
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

  it("inserts conditionals last", () => {
    sheet.addRule_(".foo { color: blue }");

    // even the conditional is registered after the above addRule_(),
    sheet.registerConditional_("sm", "@media (min-width: 320px)");
    const sheetSmall = sheet.sheetFor_("sm");
    sheetSmall.addRule_(".foo { color: red }");

    // nesting rules inserted first.
    expect(styleSheetMock.cssRules).toMatchObject([
      { cssText: ".foo { color: blue }" },
      {
        cssRules: [
          { cssText: ".foo { color: red }" }
        ],
        conditionText: "(min-width: 320px)",
      },
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

    const sheetMedium = sheet.sheetFor_("md");
    const sheetSmall = sheet.sheetFor_("sm");

    sheetSmall.addRule_(".foo { color: red }");
    sheetMedium.addRule_(".foo { color: purple }");
    sheetSmall.addRule_(".bar:hover { background: silver }");

    expect(styleSheetMock.cssRules).toMatchObject([
      { cssText: ".foo { color: blue }" },
      {
        conditionText: "(min-width: 320px)",
        cssRules: [
          { cssText: ".foo { color: red }" },
          { cssText: ".bar:hover { background: silver }" }
        ],
      },
      {
        conditionText: "(min-width: 640px)",
        cssRules: [
          { cssText: ".foo { color: purple }" },
        ],
      },
    ]);
  });

  it("can nest conditionals", () => {
    sheet.registerConditional_("sm", "@media (min-width: 320px)");
    sheet.registerConditional_("md", "@media (min-width: 640px)");
    sheet.registerConditional_("print", "@media printer");

    const sheetSmall = sheet.sheetFor_("sm");
    const sheetSmallPrinter = sheetSmall.sheetFor_("print");

    sheetSmall.addRule_(".foo { color: red }");
    sheetSmall.addRule_(".bar { background: black }");
    sheetSmallPrinter.addRule_(".bar { background: white }");
    sheetSmall.addRule_(".zoo { color: blue }");
    sheetSmallPrinter.addRule_(".tee { margin: 1rem }");

    expect(styleSheetMock.cssRules).toMatchObject([
      {
        conditionText: "(min-width: 320px)",
        cssRules: [
          { cssText: ".foo { color: red }" },
          { cssText: ".bar { background: black }" },
          { cssText: ".zoo { color: blue }" },
          {
            conditionText: "printer",
            cssRules: [
              { cssText: ".bar { background: white }" },
              { cssText: ".tee { margin: 1rem }" }
            ],
          },
        ],
      },
    ]);
  });
});
