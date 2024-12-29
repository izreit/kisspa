import type { CSSGroupingRuleLike } from "../../sheet";

export interface MockCSSGroupingRuleLike extends CSSGroupingRuleLike {
  readonly ruleTextSpy: string;
}
export function createMockCSSGroupRuleLike(ruleText: string): MockCSSGroupingRuleLike {
  const rs: MockCSSGroupingRuleLike[] = [];
  return {
    ruleTextSpy: ruleText,
    cssRules: rs,
    insertRule(childRuleText, index) {
      rs.splice(index, 0, createMockCSSGroupRuleLike(childRuleText));
      return index;
    },
  };
}
