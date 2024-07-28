import { assemble, AssembleContext, Backing, createSpecial } from "../core/backing";
import { PropChildren } from "../core/types";
import { mapCoerce } from "../core/util";
import { createBackingBase } from "./base";

export namespace Fragment {
  export interface Props {
    children?: PropChildren;
  }
}

export const Fragment = createSpecial((actx: AssembleContext, { children }: Fragment.Props): Backing => {
  const base = createBackingBase("Fragment");
  base.setBackings_(mapCoerce(children, c => assemble(actx, c)));
  return base;
});
