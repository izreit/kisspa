import { autorun } from "../../reactive";
import { assemble, AssembleContext, assignLocation, Backing, BackingLocation, createLocation, createSpecial, tailOf } from "../core/backing";
import { makeJSXElement } from "../core/h";
import { Component } from "../core/types";
import { arrayify } from "../core/util";

export namespace Dynamic {
  export type Props<T, C> = T & {
    children?: C;
    component?: () => Component<T, C> | string | keyof JSX.IntrinsicElements;
  }
}

export const Dynamic = createSpecial(<T, C>(actx: AssembleContext, props: Dynamic.Props<T, C>): Backing => {
  let backing: Backing | null = null;
  let loc = createLocation();

  const cancelUpdate = autorun(() => {
    if (!props.component) return;
    backing?.dispose();
    backing = assemble(actx, makeJSXElement(props.component(), props, arrayify(props.children)));
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
