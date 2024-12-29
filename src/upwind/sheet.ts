
export interface SubSheet {
  addRule_(childRuleText: string): void;
  sheetFor_(name: string): SubSheet;
}

export interface Sheet extends SubSheet {
  registerConditional_(name: string, cond: string): void;
}

export interface CSSRuleListLike {
  readonly length: number;
  [index: number]: CSSGroupingRuleLike | unknown;
}

export interface CSSGroupingRuleLike {
  cssRules: CSSRuleListLike;
  insertRule(childRuleText: string, index: number): number;
}

export function createSheet(target: CSSGroupingRuleLike): Sheet {
  let nextPrio = 0;
  const table: { [name: string]: { prio_: number, initial_: string } | undefined } = {};
  const ruleToSheetTable: WeakMap<CSSGroupingRuleLike, [number, SubSheet]> = new WeakMap();

  const createSub = (rule: CSSGroupingRuleLike): SubSheet => ({
    addRule_: childRuleText => rule.insertRule(childRuleText, rule.cssRules.length),
    sheetFor_(name) {
      const childRules = rule.cssRules;
      const targetPrio = table[name]!.prio_; // if no table[name], it means a logic error and we should throw immediately.
      let i = 0;
      for (; i < childRules.length; ++i) {
        const childRule = childRules[i];
        const revEntry = ruleToSheetTable.get(childRule as CSSGroupingRuleLike); // undefined if rule isn't CSSGroupRuleLike
        const prio = revEntry ? revEntry[0] : nextPrio; // nextPrio is a sentinel: always larger than any valid prio
        if (targetPrio === prio)
          return revEntry![1]; // ! because if revEntry is null, prio is conditions.length, not same with any targetPrio.
        if (targetPrio < prio)
          break;
      }
      const inserted = rule.cssRules[rule.insertRule(table[name]!.initial_, i)]! as CSSGroupingRuleLike;
      const ret = createSub(inserted);
      ruleToSheetTable.set(inserted, [targetPrio, ret]);
      return ret;
    },
  });

  return {
    ...createSub(target),
    registerConditional_(name, cond) {
      table[name] = { prio_: nextPrio++, initial_: cond + "{}" };
    },
  }
}
