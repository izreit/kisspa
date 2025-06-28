import type { JSXInternal } from "./core/jsx.js";

export {
  assemble,
  assignLocation,
  createBackingCommon,
  createSpecial,
  getRefresher,
  resolveLocation,
  setRefresher,
  useComponentMethods,
  onMount,
  onCleanup,
} from "./core/assemble.js";
export type { ComponentMethods } from "./core/assemble.js";
export { deprop } from "./core/helpers.js";
export type { Prop } from "./core/helpers.js";
export { attach, createRoot } from "./core/root.js";
export type { Root } from "./core/root.js";
export { createRef } from "./core/types.js";
export type {
  Accessor,
  Attributes,
  Backing,
  BackingLocation,
  Component,
  JSXElement,
  JSXNode,
  JSXNodeAsync,
  JSXNodeAsyncValue,
  JSXNodeSync,
  PropChildren,
  PropRef,
  Ref,
  Refresher,
} from "./core/types.js";
export { createContext, useContext } from "./special/context.js";
export type { Context, ContextProviderProps } from "./special/context.js";
export { Dynamic } from "./special/dynamic.js";
export { For } from "./special/for.js";
export { Portal, PortalDest } from "./special/portal.js";
export { Show } from "./special/show.js";
export { Suspense } from "./special/suspense.js";
export { Match, Switch } from "./special/switch.js";
export type { JSXInternal as JSX };
