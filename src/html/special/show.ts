import { type AssembleContext, type Backing, type SpecialComponent, createSimpleBacking, createSpecial } from "../core/backing.js";
import type { JSXNode, PropChildren } from "../core/types.js";
import { Match, createSwitchContextValue, switchContextKey } from "./switch.js";

export namespace Show {
  export interface WhenProps {
    when: () => boolean;
    capture?: false;
    fallback?: JSXNode;
    children?: PropChildren;
  }
  export interface CaptureProps<T> {
    when: () => Exclude<T, boolean | null | undefined> | false | null | undefined;
    capture: true;
    fallback?: JSXNode;
    children?: (v: () => Exclude<T, boolean>) => PropChildren;
  }
  export type Props<T> = WhenProps | CaptureProps<T>;
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
