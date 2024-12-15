import { autorun } from "../../reactive";
import { type AssembleContext, type Backing, assemble, createSimpleBacking, createSpecial } from "../core/backing";
import { jsx } from "../core/h";
import type { Component } from "../core/types";

export namespace Dynamic {
  export type Props<T> = {
    component: () => Component<T>;
    props: () => T;
  }
}

export const Dynamic = createSpecial(<T>(actx: AssembleContext, props: Dynamic.Props<T>): Backing => {
  const base = createSimpleBacking("Dynamic");
  base.addDisposer_(autorun(() => {
    base.setBackings_([assemble(actx, jsx(props.component(), props.props()))]);
  }));
  return base;
});
