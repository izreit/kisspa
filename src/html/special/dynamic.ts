import { autorun } from "../../reactive";
import { assemble, AssembleContext, assignLocation, Backing, BackingLocation, createLocation, createSpecial, tailOf } from "../core/backing";
import { jsx } from "../core/h";
import { Component } from "../core/types";

export namespace Dynamic {
  export type Props<T> = T & {
    component?: () => Component<T>;
  }
}

export const Dynamic = createSpecial(<T>(actx: AssembleContext, props: Dynamic.Props<T>): Backing => {
  let backing: Backing | null = null;
  let loc = createLocation();

  const cancelUpdate = autorun(() => {
    if (!props.component) return;
    backing?.dispose();
    backing = assemble(actx, jsx(props.component(), props));
    backing.insert(loc);
  });

  return {
    insert(l: BackingLocation | null | undefined) {
      if (assignLocation(loc, l))
        backing?.insert(l);
    },
    tail: () => backing?.tail() ?? tailOf(loc.prev),
    dispose() {
      cancelUpdate();
      backing?.dispose();
      backing = null;
    },
    name: "Dynamic",
  };
});
