import { Backing, BackingLocation, assemble, assignLocation, collectDelayings, createSpecial, disposeBackings, insertBackings, tailOf, tailOfBackings } from "../core/backing";
import { ChildrenProp, JSXNode } from "../core/types";
import { mapCoerce } from "../core/util";

export namespace Suspense {
  export interface Props extends ChildrenProp {
    fallback?: JSXNode;
  }
}

export const Suspense = createSpecial(function Suspense(props: Suspense.Props): Backing {
  const { fallback, children } = props;
  let fallbackBacking: Backing | null = null;
  let loc: BackingLocation = { parent: null, prev: null };

  let [backings, promises] = collectDelayings(() => mapCoerce(children, c => assemble(c)));

  let resolved = false;
  Promise.all(promises).then(() => {
    resolved = true;
    fallbackBacking?.dispose();
    fallbackBacking = null;
    insertBackings(backings, loc);
  });

  if (fallback) {
    fallbackBacking = assemble(fallback);
  }

  const insert = (l: BackingLocation | null | undefined) => {
    if (!assignLocation(loc, l)) return;
    if (resolved) {
      insertBackings(backings, loc);
    } else {
      fallbackBacking?.insert(loc);
    }
  };
  const tail = () => {
    return resolved ?
      tailOfBackings(backings, loc.prev) :
      (fallbackBacking?.tail() ?? tailOf(loc.prev));
  };
  const dispose = () => {
    if (resolved) {
      disposeBackings(backings);
    } else {
      fallbackBacking?.dispose();
    }
  };
  return { insert, tail, dispose, name: "Suspense" };
});
