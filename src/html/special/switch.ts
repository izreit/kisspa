import { autorun, signal, watchProbe } from "../../reactive/index.js";
import { type AssembleContext, assemble, callAll, createSpecial, createTransparentBacking } from "../core/assemble.js";
import type { Backing, PropChildren } from "../core/types.js";
import { mapCoerce } from "../core/util.js";

interface SwitchContextValue {
  register_(cond: () => unknown, strict: boolean | null | undefined): [() => boolean, () => unknown];
  dispose_():void;
}

export function createSwitchContextValue(): SwitchContextValue {
  const stricterIsTruthy = (v: unknown) => v != null && v !== false;
  const [activeIndex, setActiveIndex] = signal<number>(-1);
  const stats: unknown[] = [];
  const judges: ((v: unknown) => unknown)[] = [];
  const disposers: (() => void)[] = [];

  return {
    register_(cond, strict) {
      const idx = stats.push(false) - 1;
      const [capturedValue, setCapturedValue] = signal<unknown>(null);
      const judge = strict ? stricterIsTruthy : Boolean;
      judges[idx] = judge;
      disposers.push(
        watchProbe(cond, setCapturedValue, judge),
        autorun(() => {
          stats[idx] = cond();
          setActiveIndex(stats.findIndex((v, i) => judges[i](v)));
        })
      );
      return [() => activeIndex() === idx, capturedValue];
    },
    dispose_() { callAll(disposers); }
  };
}

export namespace Switch {
  export interface Props {
    children?: PropChildren;
  }
}

export const switchContextKey = Symbol();

export const Switch = createSpecial((actx: AssembleContext, props: Switch.Props): Backing => {
  const childActx = { ...actx, [switchContextKey]: createSwitchContextValue() };
  return createTransparentBacking("Sw", null, mapCoerce(props.children, c => assemble(childActx, c)));
});

export namespace Match {
  export interface WhenProps {
    when?: () => boolean;
    capture?: false;
    children?: PropChildren;
  }
  export interface CaptureProps<T> {
    when: () => Exclude<T, boolean | null | undefined> | false | null | undefined;
    capture: true;
    children?: (v: () => Exclude<T, boolean>) => PropChildren;
  }
  export type Props<T> = WhenProps | CaptureProps<T>;
}

export const Match = createSpecial(<T>(actx: AssembleContext, props: Match.Props<T>): Backing => {
  const { when, capture, children } = props;
  const [isActive, capturedValue] = (actx[switchContextKey] as SwitchContextValue).register_(when || (() => true), capture);
  const base = createTransparentBacking("Match");

  base.addDisposer_(
    watchProbe(isActive, toShow => {
      let bs: Backing[] | null | undefined;
      if (toShow && children) {
        const cs = capture ?
          children(capturedValue as (() => Exclude<T, boolean>)) : // 'as' is inevitable since it's provided by switchCtx...
          children;
        bs = mapCoerce(cs, c => assemble(actx, c));
      }
      base.resetMount_(bs);
    })
  );

  return base;
});
