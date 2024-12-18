import { autorun, signal, watchProbe } from "../../reactive";
import { type AssembleContext, type Backing, assemble, callAll, createSimpleBacking, createSpecial } from "../core/backing";
import { jsx } from "../core/h";
import type { JSXNode, PropChildren } from "../core/types";
import { arrayify, isFunction, mapCoerce } from "../core/util";
import { createContextFun } from "./context";
import { Show } from "./show";

interface SwitchContextValue {
  register_(cond: () => unknown): number;
  active_(): number;
  dispose_():void;
}

function createSwitchContextValue(): SwitchContextValue {
  const [activeIndex, setActiveIndex] = signal<number>(-1);
  const stats: boolean[] = [];
  const disposers: (() => void)[] = [];

  return {
    register_(cond) {
      const idx = stats.push(false) - 1;
      disposers.push(autorun(() => {
        stats[idx] = !!cond();
        setActiveIndex(stats.findIndex(v => v));
      }));
      return idx;
    },
    active_: activeIndex,
    dispose_() { callAll(disposers); }
  };
}

const { ProviderFun: switchContextProviderFun, use: useSwitchContext } = createContextFun(createSwitchContextValue());

export namespace Switch {
  export interface Props {
    fallback?: JSXNode;
    children?: PropChildren;
  }
}

export const Switch = createSpecial((actx: AssembleContext, props: Switch.Props): Backing => {
  const { fallback, children: rawChildren } = props;
  const children = arrayify(rawChildren);
  const switchCtx = createSwitchContextValue();

  // Equivalent to <SwitchContextProvider value={ctx}> {children} <Show when={...}>{fallback}</Show> </SwitchContextProvider>
  const b = switchContextProviderFun(
    actx,
    {
      value: switchCtx,
      children: (fallback && rawChildren) ? [
        ...children,
        jsx(Show, { when: () => switchCtx.active_() === -1, children: fallback }),
      ] : children
    }
  );
  b.addDisposer_(switchCtx.dispose_);
  return b;
});

export namespace Match {
  export interface WhenProps {
    when: () => boolean;
    children?: PropChildren;
  }
  export interface GuardProps<T extends object> {
    when: () => T | false;
    children?: (v: T) => PropChildren;
  }
  export type Props<T extends object> = WhenProps | GuardProps<T>;
}

export const Match = createSpecial(<T extends object>(actx: AssembleContext, props: Match.Props<T>): Backing => {
  const { when, children } = props;
  let showing = false;
  const switchCtx = useSwitchContext();
  const index = switchCtx.register_(when);

  const base = createSimpleBacking("Match");

  base.addDisposer_(watchProbe(
    () => (switchCtx.active_() === index),
    toShow => {
      showing = toShow;
      let bs: Backing[] | null | undefined;
      if (showing && children) {
        const cs = isFunction(children) ? children(when() as T): children; // `as T` is valid since guard() is true here
        bs = mapCoerce(cs, c => assemble(actx, c));
      }
      base.setBackings_(bs);
    }
  ));

  return base;
});
