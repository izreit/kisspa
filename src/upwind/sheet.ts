
export interface Sheet {
  addRule_(childRuleText: string): void;
  sheetFor_(name: string): Sheet;
}

export interface RootSheet extends Sheet {
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

export function createRootSheet(target: CSSGroupingRuleLike): RootSheet {
  let nextPrio = 0;
  const table: { [name: string]: { prio_: number, initial_: string } | undefined } = {};
  const ruleToSheetTable: WeakMap<CSSGroupingRuleLike, [number, Sheet]> = new WeakMap();

  const createChildSheet = (rule: CSSGroupingRuleLike): Sheet => {
    let childSheetsCount = 0;
    return {
      addRule_: childRuleText => rule.insertRule(childRuleText, rule.cssRules.length - childSheetsCount),
      sheetFor_(name) {
        const childRules = rule.cssRules;
        const { prio_: targetPrio, initial_: targetInitial } = table[name]!; // if no table[name], it means a logic error and we should throw immediately.
        let i = childRules.length - 1;
        for (; i >= 0; --i) {
          const childRule = childRules[i];
          const revEntry = ruleToSheetTable.get(childRule as CSSGroupingRuleLike); // undefined if rule isn't CSSGroupRuleLike
          const prio = revEntry ? revEntry[0] : -1; // -1 is a sentinel: always smaller than any valid prio
          if (targetPrio === prio)
            return revEntry![1]; // ! because if revEntry is null, prio is conditions.length, not same with any targetPrio.
          if (targetPrio > prio)
            break;
        }
        const inserted = rule.cssRules[rule.insertRule(targetInitial, i + 1)]! as CSSGroupingRuleLike;
        const ret = createChildSheet(inserted);
        ruleToSheetTable.set(inserted, [targetPrio, ret]);
        ++childSheetsCount;
        return ret;
      },
    };
  };

  return {
    ...createChildSheet(target),
    registerConditional_(name, cond) {
      table[name] = { prio_: nextPrio++, initial_: cond + "{}" };
    },
  }
}
