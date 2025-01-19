import { type AssembleContext, type Backing, type SpecialComponent, createSimpleBacking, createSpecial } from "../core/backing";
import type { JSXNode, PropChildren } from "../core/types";
import { Match, createSwitchContextValue, switchContextKey } from "./switch";

export namespace Show {
  export interface WhenProps {
    when: () => boolean;
    guarded?: false;
    fallback?: JSXNode;
    children?: PropChildren;
  }
  export interface GuardProps<T> {
    when: () => Exclude<T, boolean> | false;
    guarded: true;
    fallback?: JSXNode;
    children?: (v: () => Exclude<T, boolean>) => PropChildren;
  }
  export type Props<T> = WhenProps | GuardProps<T>;
}

export const Show = createSpecial(<P>(actx: AssembleContext, props: Show.Props<P>): Backing => {
  const { fallback } = props;
  const childActx = { ...actx, [switchContextKey]: createSwitchContextValue() };
  const matchFun = (Match as SpecialComponent<Match.Props<P>>).special;
  return fallback ? createSimpleBacking("Show", null, [
    matchFun(childActx, props),
    matchFun(childActx, { children: fallback }),
  ]) : matchFun(childActx, props);
});
