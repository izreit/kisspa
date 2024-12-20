import { autorun, signal, watchProbe } from "../../reactive";
import { type AssembleContext, type Backing, assemble, callAll, createSimpleBacking, createSpecial } from "../core/backing";
import type { PropChildren } from "../core/types";
import { arrayify, mapCoerce } from "../core/util";
import { createContextFun } from "./context";

interface SwitchContextValue {
  register_(cond: () => unknown, strict: boolean | null | undefined): [() => boolean, () => unknown];
  dispose_():void;
}

function createSwitchContextValue(): SwitchContextValue {
  const notFalse = (v: unknown) => v !== false;
  const [activeIndex, setActiveIndex] = signal<number>(-1);
  const stats: unknown[] = [];
  const judges: ((v: unknown) => unknown)[] = [];
  const disposers: (() => void)[] = [];

  return {
    register_(cond, strict) {
      const idx = stats.push(false) - 1;
      const [guardedValue, setGuardedValue] = signal<unknown>(null);
      const judge = strict ? notFalse : Boolean;
      judges[idx] = judge;
      disposers.push(
        watchProbe(cond, setGuardedValue, judge),
        autorun(() => {
          stats[idx] = cond();
          setActiveIndex(stats.findIndex((v, i) => judges[i](v)));
        })
      );
      return [() => activeIndex() === idx, guardedValue];
    },
    dispose_() { callAll(disposers); }
  };
}

const { ProviderFun: switchContextProviderFun, use: useSwitchContext } = createContextFun(createSwitchContextValue());

export namespace Switch {
  export interface Props {
    children?: PropChildren;
  }
}

export const Switch = createSpecial((actx: AssembleContext, props: Switch.Props): Backing => {
  const { children: rawChildren } = props;
  const children = arrayify(rawChildren);
  const switchCtx = createSwitchContextValue();

  // Equivalent to <SwitchContextProvider value={ctx}> {children} </SwitchContextProvider>
  const b = switchContextProviderFun(actx, { value: switchCtx, children });

  b.addDisposer_(switchCtx.dispose_);
  return b;
});

export namespace Match {
  export interface WhenProps {
    when?: () => boolean;
    guarded?: false;
    children?: PropChildren;
  }
  export interface GuardProps<T> {
    when: () => Exclude<T, boolean> | false;
    guarded: true;
    children?: (v: () => Exclude<T, boolean>) => PropChildren;
  }
  export type Props<T> = WhenProps | GuardProps<T>;
}

export const Match = createSpecial(<T>(actx: AssembleContext, props: Match.Props<T>): Backing => {
  const { when, guarded, children } = props;
  const [isActive, guardedValue] = useSwitchContext().register_(when || (() => true), guarded);
  const base = createSimpleBacking("Match");

  let showing = false;
  base.addDisposer_(
    watchProbe(isActive, toShow => {
      showing = toShow;
      let bs: Backing[] | null | undefined;
      if (showing && children) {
        const cs = guarded ?
          children(guardedValue as (() => Exclude<T, boolean>)) : // 'as' is inevitable since it's provided by switchCtx...
          children;
        bs = mapCoerce(cs, c => assemble(actx, c));
      }
      base.setBackings_(bs);
    })
  );

  return base;
});
