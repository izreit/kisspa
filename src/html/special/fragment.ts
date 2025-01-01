import { type AssembleContext, type Backing, assemble, createSimpleBacking, createSpecial } from "../core/backing";
import type { PropChildren } from "../core/types";
import { mapCoerce } from "../core/util";

export namespace Fragment {
  export interface Props {
    children?: PropChildren;
  }
}

export const Fragment = createSpecial((actx: AssembleContext, { children }: Fragment.Props): Backing => {
  return createSimpleBacking("Frag", null, mapCoerce(children, c => assemble(actx, c)));
});
