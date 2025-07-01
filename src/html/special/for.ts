import { autorun, signal, withoutObserver } from "../../reactive/index.js";
import { type AssembleContext, assemble, createBackingCommon, createSpecial } from "../core/assemble.js";
import { deprop } from "../core/helpers.js";
import type { Backing, JSXNode, MountLocation } from "../core/types.js";
import { isArray } from "../core/util.js";
import { lcs } from "./internal/lcs.js";

export namespace For {
  export type ForCallback<E> = (el: E, i: () => number) => JSXNode;

  export interface Props<E> {
    each: E[] | (() => E[]);
    key?: (el: E, ix: number) => any;
    children: ForCallback<E> | ForCallback<E>[];
  }
}

export const For = createSpecial(function For<E>(actx: AssembleContext, props: For.Props<E>): Backing {
  const { each, key, children } = props;
  const fun = isArray(children) ? children[0] : children;

  const ixTable: WeakMap<Backing, [() => number, (v: number) => void]> = new WeakMap();
  const base = createBackingCommon("For", () => backings);
  const loc = base.location_;
  let backings: Backing[] = [];
  let backingTable: Map<any, Backing> = new Map();

  base.addDisposer_(autorun(() => {
    const nextTable: Map<any, Backing> = new Map();
    const nextBackings: Backing[] = [];
    const es = deprop(each);
    for (let i = 0; i < es.length; ++i) { // not map() but for-loop, to skip deleted elements.
      const e = es[i];
      if (e != null) {
        const k = key ? key(e, i) : e;
        let b = backingTable.get(k);
        if (b) {
          ixTable.get(b!)![1](i); // update index
          backingTable.delete(k);
        } else {
          const ixSignal = signal(i);
          b = assemble(actx, withoutObserver(() => fun(e as E, ixSignal[0])));
          ixTable.set(b, ixSignal);
        }
        nextTable.set(k, b);
        nextBackings.push(b);
      }
    }

    // Dispose dropped backings. This makes stale elements of `backings` removed from loc.parent.
    // So the following part only inject `nextBackings` into `commonBackings`, without removing slated.
    for (const [, b] of backingTable)
      b.dispose();

    backingTable.clear();
    backingTable = nextTable;

    if (loc.parent) {
      let ni = 0;
      const l = { ...(loc as MountLocation) }; // `as` must be valid since already checked loc.parent
      const commonBackings: (Backing | null)[] = lcs(backings, nextBackings);
      commonBackings.push(null); // The sentinel. Must be different to any valid backings.
      for (let cmi = 0; cmi < commonBackings.length; ++cmi) {
        const commonBacking = commonBackings[cmi];
        for (let nb = nextBackings[ni]; ni < nextBackings.length && nb !== commonBacking; ++ni, nb = nextBackings[ni]) {
          nb.mount(l);
          l.prev = nb;
        }
        ++ni;
        l.prev = commonBacking;
      }
    }

    backings = nextBackings;
  }));

  return base;
});
