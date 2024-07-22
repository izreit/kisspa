import { watchProbe } from "../../reactive";
import { Backing, BackingLocation, assemble, assignLocation, createLocation, createSpecial, tailOf } from "../core/backing";
import { disposeBackings, insertBackings, tailOfBackings } from "../core/specialHelper";
import { JSXNode, PropChildren } from "../core/types";
import { mapCoerce } from "../core/util";

export namespace Show {
  export interface Props {
    when: () => boolean;
    fallback?: JSXNode;
    children?: PropChildren;
  }
}

export function ShowImpl(props: Show.Props): Backing {
  const { when, fallback, children } = props;
  let thenBackings: Backing[] | null = null;
  let fallbackBacking: Backing | null = null;
  let showing = false;
  let loc = createLocation();

  function update(): void {
    if (showing) {
      fallbackBacking?.dispose();
      fallbackBacking = null;
      if (!thenBackings)
        thenBackings = mapCoerce(children, c => assemble(c));
      insertBackings(thenBackings, loc);
    } else {
      disposeBackings(thenBackings);
      thenBackings = null;
      if (fallback) {
        if (!fallbackBacking)
          fallbackBacking = assemble(fallback);
        fallbackBacking.insert(loc);
      }
    }
  }

  const cancelUpdate = watchProbe(when, toShow => {
    showing = toShow;
    update();
  });

  const insert = (l: BackingLocation | null | undefined) => {
    assignLocation(loc, l);
    update();
  };
  const tail = (): Node | null | undefined => {
    return showing ?
      tailOfBackings(thenBackings, loc.prev) :
      (fallbackBacking?.tail() ?? tailOf(loc.prev));
  };
  const dispose = () => {
    cancelUpdate();
    disposeBackings(thenBackings);
    fallbackBacking?.dispose();
  };
  return { insert, tail, dispose, name: "Show" };
}

export const Show = createSpecial(ShowImpl);
