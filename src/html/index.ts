import type { JSXInternal } from "./core/jsx.js";

export {
  assemble,
  assignLocation,
  createBackingCommon,
  createSpecial,
  tailOf,
  useComponentMethods,
} from "./core/backing.js";
export type { Backing, BackingLocation, ComponentMethods } from "./core/backing.js";
export { h } from "./core/h.js";
export { deprop } from "./core/helpers.js";
export type { Prop } from "./core/helpers.js";
export { attach, createRoot } from "./core/root.js";
export type { Root } from "./core/root.js";
export { $h, createRef } from "./core/types.js";
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
} from "./core/types.js";
export { createContext, withContext } from "./special/context.js";
export type { Context, ContextProviderProps } from "./special/context.js";
export { Dynamic } from "./special/dynamic.js";
export { For } from "./special/for.js";
export { Fragment } from "./special/fragment.js";
export { Portal, PortalDest } from "./special/portal.js";
export { Show } from "./special/show.js";
export { Suspense } from "./special/suspense.js";
export { Match, Switch } from "./special/switch.js";
export type { JSXInternal as JSX };
