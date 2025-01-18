import type { JSXInternal } from "./core/jsx";

export {
  assemble,
  assignLocation,
  createBackingCommon,
  createSpecial,
  tailOf,
  useComponentMethods,
} from "./core/backing";
export type { Backing, BackingLocation, ComponentMethods } from "./core/backing";
export { h, jsx, jsxDEV, jsxs } from "./core/h";
export { deprop } from "./core/helpers";
export type { Prop } from "./core/helpers";
export { attach, createRoot } from "./core/root";
export type { Root } from "./core/root";
export { $h, createRef } from "./core/types";
export type {
  Accessor,
  Attributes,
  Component,
  JSXElement,
  JSXNode,
  JSXNodeAsync,
  JSXNodeAsyncValue,
  JSXNodeSync,
  PropChildren,
  PropRef,
  Ref,
} from "./core/types";
export { createContext, withContext } from "./special/context";
export type { Context, ContextProviderProps } from "./special/context";
export { Dynamic } from "./special/dynamic";
export { For } from "./special/for";
export { Fragment } from "./special/fragment";
export { Portal, PortalDest } from "./special/portal";
export { Show } from "./special/show";
export { Suspense } from "./special/suspense";
export { Match, Switch } from "./special/switch";
export type { JSXInternal as JSX };
