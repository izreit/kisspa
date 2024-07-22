import { autorun, signal, watchProbe } from "../../reactive";
import { assemble, assignLocation, Backing, BackingLocation, createLocation, createSpecial, tailOf } from "../core/backing";
import { h } from "../core/h";
import { disposeBackings, insertBackings, tailOfBackings } from "../core/specialHelper";
import { JSXNode, PropChildren } from "../core/types";
import { arrayify, mapCoerce } from "../core/util";
import { createContextFun } from "./context";
import { Show } from "./show";

interface SwitchContextValue {
  register_(cond: () => boolean): number;
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
        stats[idx] = cond();
        setActiveIndex(stats.findIndex(v => v));
      }));
      return idx;
    },
    active_: activeIndex,
    dispose_() { disposers.forEach(c => c()); }
  };
}

const { ProviderFun: switchContextProviderFun, useContext: useSwitchContext } = createContextFun(createSwitchContextValue());

export namespace Switch {
  export interface Props {
    fallback?: JSXNode;
    children?: PropChildren;
  }
}

export const Switch = createSpecial((props: Switch.Props): Backing => {
  const { fallback, children: rawChildren } = props;
  const children = arrayify(rawChildren);
  const ctx = createSwitchContextValue();

  // Equivalent to <SwitchContextProvider value={ctx}> {children} <Show when={...}>{fallback}</Show> </SwitchContextProvider>
  const b = switchContextProviderFun({
    value: ctx,
    children: (fallback && rawChildren) ? [
      ...children,
      h(Show, { when: () => ctx.active_() === -1 }, fallback),
    ] : children
  });

  return {
    ...b,
    dispose() {
      b.dispose();
      ctx.dispose_();
    },
  }
});

export namespace Match {
  export interface WhenProps {
    when: () => boolean;
    children?: PropChildren;
  }
  export interface GuardProps<T extends object> {
    guard: () => T | false;
    children?: (v: T) => PropChildren;
  }
  export type Props<T extends object> = WhenProps | GuardProps<T>;
}

export const Match = createSpecial(<T extends object>(props: Match.Props<T>): Backing => {
  let childrenBackings: Backing[] | null = null;
  let showing = false;
  let loc = createLocation();

  const ctx = useSwitchContext();
  const when = "when" in props ? props.when : () => !!props.guard();
  const index = ctx.register_(when);
  const cond = () => ctx.active_() === index;

  function update(): void {
    if (showing) {
      if (!childrenBackings && props.children) {
        const cs = "when" in props ? props.children : props.children(props.guard() as T); // `as T` is valid since guard() is true here
        childrenBackings = mapCoerce(cs, c => assemble(c));
      }
      insertBackings(childrenBackings, loc);
    } else {
      disposeBackings(childrenBackings);
      childrenBackings = null;
    }
  }

  const cancelUpdate = watchProbe(cond, toShow => {
    showing = toShow;
    update();
  });

  return {
    insert(l: BackingLocation | null | undefined) {
      assignLocation(loc, l);
      update();
    },
    tail: () => showing ? tailOfBackings(childrenBackings, loc.prev) : tailOf(loc.prev),
    dispose() {
      cancelUpdate();
      disposeBackings(childrenBackings);
    },
    name: "Match",
  };
});
