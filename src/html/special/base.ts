import { Backing, createLocation, assignLocation } from "../core/backing";
import { insertBackings, disposeBackings, tailOfBackings } from "../core/specialHelper";

export interface BackingBase extends Backing {
  extractBackings_: () => Backing[] | null | undefined;
  setBackings_: (bs: Backing[] | null | undefined) => void;
  addDisposer_: (f: () => void) => void;
}

export function createBackingBase(name: string): BackingBase {
  const loc = createLocation();
  let backings: Backing[] | null | undefined;
  const disposers: (() => void)[] = [];
  return {
    extractBackings_: () => {
      insertBackings(backings, null);
      return backings;
    },
    setBackings_(bs) {
      if (backings !== bs) {
        disposeBackings(backings);
        backings = bs;
        insertBackings(bs, loc);
      }
    },
    addDisposer_: f => disposers.push(f),
    insert(l) {
      if (assignLocation(loc, l))
        insertBackings(backings, l);
    },
    tail: () => tailOfBackings(backings, loc.prev),
    dispose() {
      disposers.forEach(d => d());
      disposeBackings(backings);
    },
    name,
  };
}
