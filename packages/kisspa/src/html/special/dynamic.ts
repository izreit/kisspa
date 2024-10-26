import { autorun } from "../../reactive";
import { assemble, AssembleContext, Backing, createSimpleBacking, createSpecial } from "../core/backing";
import { jsx } from "../core/h";
import { Component } from "../core/types";

export namespace Dynamic {
  export type Props<T> = T & {
    component?: () => Component<T>;
  }
}

export const Dynamic = createSpecial(<T>(actx: AssembleContext, props: Dynamic.Props<T>): Backing => {
  const base = createSimpleBacking("Dynamic");
  base.addDisposer_(autorun(() => {
    if (props.component)
      base.setBackings_([assemble(actx, jsx(props.component(), props))]);
  }));
  return base;
});
