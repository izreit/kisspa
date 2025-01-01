import { type AssembleContext, type SimpleBacking, assemble, createSimpleBacking, createSpecial } from "../core/backing";
import type { Component, JSXNode, PropChildren } from "../core/types";
import { lastOf, mapCoerce } from "../core/util";

export interface ContextProviderProps<T> {
  value: T;
  children?: PropChildren;
}

export type ContextFunPair<T> = {
  ProviderFun: (actx: AssembleContext, props: ContextProviderProps<T>) => SimpleBacking;
  key: symbol;
  initial_: T;
};

export function createContextFun<T>(initial: T): ContextFunPair<T> {
  const key = Symbol();
  const ProviderImpl = (actx: AssembleContext, { value, children }: ContextProviderProps<T>): SimpleBacking => {
    const childActx = { ...actx, [key]: value };
    return createSimpleBacking("Ctx", null, mapCoerce(children, c => assemble(childActx, c)));
  };

  return {
    ProviderFun: ProviderImpl,
    key,
    initial_: initial,
  };
}

export type Context<T> = {
  Provider: Component<ContextProviderProps<T>>
  key: symbol;
  initial_: T;
};

export function createContext<T>(initial: T): Context<T> {
  const { ProviderFun: ProviderImpl, key, initial_ } = createContextFun(initial);
  return { Provider: createSpecial(ProviderImpl), key, initial_ };
}

export function withContext<T, P>(ctx: Context<T>, fun: (contextValue: T) => Component<P>): Component<P> {
  return createSpecial((actx: AssembleContext, props: P) => (
    createSimpleBacking(
      "WCt",
      null,
      [assemble(actx, fun(ctx.key in actx ? actx[ctx.key] as T : ctx.initial_)(props))]
    )
  ));
}
