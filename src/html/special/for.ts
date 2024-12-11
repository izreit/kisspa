import { autorun, signal } from "../../reactive";
import { type AssembleContext, type Backing, assemble, createBackingCommon, createSpecial } from "../core/backing";
import type { JSXNode } from "../core/types";
import { arrayify } from "../core/util";
import { lcs } from "./internal/lcs";

export namespace For {
  export type ForCallback<E> = (el: E, i: () => number) => JSXNode;

  export interface Props<E> {
    each: () => E[];
    key?: (el: E, ix: number) => any;
    children: ForCallback<E> | ForCallback<E>[];
  }
}

export const For = createSpecial(function For<E>(actx: AssembleContext, props: For.Props<E>): Backing {
  const { each, key, children } = props;
  const fun = arrayify(children)[0];

  let backings: Backing[] = [];
  let backingTable: Map<any, Backing> = new Map();
  let ixTable: WeakMap<Backing, [() => number, (v: number) => void]> = new WeakMap();

  const base = createBackingCommon("For", () => backings);
  const loc = base.location_;

  base.addDisposer_(autorun(() => {
    const nextTable: Map<any, Backing> = new Map();
    const nextBackings = each().map((e, i) => {
      const k = key?.(e, i) ?? e;
      let b = backingTable.get(k);
      if (b) {
        backingTable.delete(k);
      } else {
        const ixSignal = signal(i);
        const jnode = fun(e as E, ixSignal[0]);
        b = assemble(actx, jnode);
        ixTable.set(b, ixSignal);
      }
      nextTable.set(k, b);
      return b;
    });
    backingTable.clear();
    backingTable = nextTable;

    if (loc.parent) {
      let ci = 0;
      let ni = 0;
      let l = { ...loc };
      const commonBackings = lcs(backings, nextBackings);
      for (let cmi = 0; cmi < commonBackings.length; ++cmi) {
        const commonBacking = commonBackings[cmi];
        for (let cb = backings[ci]; ci < backings.length && backings[ci] !== commonBacking; ++ci, cb = backings[ci])
          cb.dispose();
        for (let nb = nextBackings[ni]; ni < nextBackings.length && nb !== commonBacking; ++ni, nb = nextBackings[ni]) {
          nb.insert(l);
          l.prev = nb;
        }
        ++ci;
        ++ni;
        l.prev = commonBacking;
      }
      for (let cb = backings[ci]; ci < backings.length; ++ci, cb = backings[ci])
        cb.dispose();
      for (let nb = nextBackings[ni]; ni < nextBackings.length; ++ni, nb = nextBackings[ni]) {
        nb.insert(l);
        l.prev = nb;
      }
    }

    backings = nextBackings;
  }));

  return base;
});
