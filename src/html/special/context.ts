import { AssembleContext, SimpleBacking, assemble, createSimpleBacking, createSpecial } from "../core/backing";
import { Component, PropChildren } from "../core/types";
import { lastOf, mapCoerce } from "../core/util";

export interface ContextProviderProps<T> {
  value: T;
  children?: PropChildren;
}

export type ContextFunPair<T> = {
  ProviderFun: (actx: AssembleContext, props: ContextProviderProps<T>) => SimpleBacking;
  useContext: () => T;
};

export function createContextFun<T>(initial: T): ContextFunPair<T> {
  const stack: T[] = [initial];

  function ProviderImpl(actx: AssembleContext, { value, children }: ContextProviderProps<T>): SimpleBacking {
    const base = createSimpleBacking("Ctx");
    try {
      stack.push(value);
      base.setBackings_(mapCoerce(children, c => assemble(actx, c)));
    } finally {
      stack.pop();
    }
    return base;
  }

  return {
    ProviderFun: ProviderImpl,
    useContext: () => lastOf(stack)!,
  };
}

export type ContextPair<T> = {
  Provider: Component<ContextProviderProps<T>>
  useContext: () => T;
};

export function createContext<T>(initial: T): ContextPair<T> {
  const { ProviderFun: ProviderImpl, useContext } = createContextFun(initial);
  return { Provider: createSpecial(ProviderImpl), useContext };
}
