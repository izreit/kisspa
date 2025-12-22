import { type AssembleContext, assemble, createSpecial, createTransparentBacking, type TransparentBacking, useAssembleContext } from "../core/assemble.js";
import type { Component, PropChildren } from "../core/types.js";
import { mapCoerce } from "../core/util.js";

export interface ContextProviderProps<T> {
  value: T;
  children?: PropChildren;
}

export type Context<T> = {
  Provider: Component<ContextProviderProps<T>>;
  key: symbol;
  initial_: T;
};

export function createContext<T>(initial: T): Context<T> {
  const key = Symbol();
  return {
    Provider: createSpecial((actx: AssembleContext, { value, children }: ContextProviderProps<T>): TransparentBacking => {
      const childActx = { ...actx, [key]: value };
      return createTransparentBacking("Ctx", null, mapCoerce(children, c => assemble(childActx, c)));
    }),
    key,
    initial_: initial,
  };
}

export function useContext<T>(ctx: Context<T>): T {
  const actx = useAssembleContext();
  return ctx.key in actx ? actx[ctx.key] as T : ctx.initial_;
}
