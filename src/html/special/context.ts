import { Backing, assemble, assignLocation, createLocation, createSpecial } from "../core/backing";
import { disposeBackings, insertBackings, tailOfBackings } from "../core/specialHelper";
import { Component, PropChildren } from "../core/types";
import { mapCoerce } from "../core/util";

export interface ContextProviderProps<T> {
  value: T;
  children?: PropChildren;
}

export type ContextFunPair<T> = {
  ProviderFun: (props: ContextProviderProps<T>) => Backing;
  useContext: () => T;
};

export function createContextFun<T>(initial: T): ContextFunPair<T> {
  const stack: T[] = [initial];

  function ProviderImpl(props: ContextProviderProps<T>): Backing {
    let bs: Backing[];
    try {
      stack.push(props.value);
      bs = mapCoerce(props.children, c => assemble(c));
    } finally {
      stack.pop();
    }

    let loc = createLocation();
    return {
      insert: (l) => {
        if (assignLocation(loc, l))
          insertBackings(bs, loc);
      },
      tail: () => tailOfBackings(bs, loc?.prev),
      dispose: () => disposeBackings(bs),
      name: "Ctx"
    };
  }

  function useContext(): T {
    return stack[stack.length - 1]!;
  }

  return { ProviderFun: ProviderImpl, useContext };
}

export type ContextPair<T> = {
  Provider: Component<ContextProviderProps<T>, ContextProviderProps<T>["children"]>;
  useContext: () => T;
};

export function createContext<T>(initial: T): ContextPair<T> {
  const { ProviderFun: ProviderImpl, useContext } = createContextFun(initial);
  return { Provider: createSpecial(ProviderImpl), useContext };
}
