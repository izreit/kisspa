// This file is the entry point for "kisspa/jsx-runtime".
// Not bundled in the root, so IMPORT ONLY NECESSARY FILES except types to aovid duplication.
import type { JSXInternal } from "./core/jsx.js";
import type { Component, JSXElement, JSXNode } from "./core/types.js";

export { Fragment } from "./core/fragment.js";

export function jsx(name: string, attrs?: ((JSXInternal.HTMLAttributes & { children?: JSXNode | JSXNode[]; }) | null)): JSXElement;
export function jsx<P>(name: Component<P>, attrs?: P): JSXElement;
export function jsx<P>(
  name: string | Component<P>,
  attrs: ((JSXInternal.HTMLAttributes & { children?: JSXNode | JSXNode[]; }) | null) | P | null
): JSXElement {
  const a = { ...(attrs ?? {}), children: null } as (Exclude<typeof attrs, null | undefined> & { children?: any });
  const rchs = attrs && (attrs as any).children;
  const chs = Array.isArray(rchs) ? rchs.flat() : (rchs != null ? [rchs] : []);
  return { ksp$h: 1, el: null, name, attrs: a, chs, rchs };
}

export type { JSXInternal as JSX };
export const jsxs = jsx, jsxDEV = jsx;
