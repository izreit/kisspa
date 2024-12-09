import { watchProbe } from "../../reactive";
import { AssembleContext, Backing, assemble, createSimpleBacking, createSpecial } from "../core/backing";
import { JSXNode, PropChildren } from "../core/types";
import { mapCoerce } from "../core/util";

export namespace Show {
  export interface Props {
    when: () => boolean;
    fallback?: JSXNode;
    children?: PropChildren;
  }
}

export const Show = createSpecial(function ShowImpl(actx: AssembleContext, props: Show.Props): Backing {
  const { when, fallback, children } = props;
  let showing = false;

  const base = createSimpleBacking("Show");
  base.addDisposer_(watchProbe(when, toShow => {
    showing = toShow;
    const bs = showing ? mapCoerce(children, c => assemble(actx, c)) : (fallback ? [assemble(actx, fallback)] : null);
    base.setBackings_(bs);
  }));

  return base;
});
