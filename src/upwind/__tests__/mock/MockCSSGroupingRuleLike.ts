import type { CSSGroupingRuleLike } from "../../sheet";

export interface MockCSSGroupingRuleLike extends CSSGroupingRuleLike {
  // Set only for mock of CSSConditionRule (e.g. @media)
  readonly conditionText: string | undefined;

  // NOTE emulation is NOT PERFECT. only keeps the rule text *initially inserted*.
  readonly cssText: string;
}

export function createMockCSSGroupRuleLike(ruleText: string): MockCSSGroupingRuleLike {
  const rs: MockCSSGroupingRuleLike[] = [];

  const m = ruleText.match(/^@(?:media|supports|container|layer)\s*(?<cond>.*)\s*{\s*}\s*$/);
  const conditionText = m ? m.groups!.cond : undefined;

  return {
    conditionText,
    cssText: ruleText,
    cssRules: rs,
    insertRule(childRuleText, index) {
      rs.splice(index, 0, createMockCSSGroupRuleLike(childRuleText));
      return index;
    },
  };
}
