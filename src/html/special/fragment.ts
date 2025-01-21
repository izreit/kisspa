import { type AssembleContext, type Backing, assemble, createSimpleBacking, createSpecial } from "../core/backing.js";
import type { PropChildren } from "../core/types.js";
import { mapCoerce } from "../core/util.js";

export namespace Fragment {
  export interface Props {
    children?: PropChildren;
  }
}

export const Fragment = createSpecial((actx: AssembleContext, { children }: Fragment.Props): Backing => {
  return createSimpleBacking("Frag", null, mapCoerce(children, c => assemble(actx, c)));
});
