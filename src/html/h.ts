// This file is the entry point for "kisspa/h".
// Not bundled in the root, so IMPORT ONLY NECESSARY FILES except types to aovid duplication.
import { JSXInternal } from "./core/jsx.js";
import type { Component, JSXElement, JSXNode } from "./core/types.js";
import type { Arrayify } from "./core/util.js";

export { Fragment } from "./core/fragment.js";

export function h(name: string, attrs?: JSXInternal.HTMLAttributes | null, ...children: (JSXNode | JSXNode[])[]): JSXElement;
export function h<P extends { children?: any[] }>(name: Component<P>, attrs?: P, ...children: Arrayify<P["children"]>): JSXElement;
export function h<P>(name: string | Component<P>, attrs?: JSXInternal.HTMLAttributes | P | null, ...children: any): JSXElement {
  const rawChildren = children.length === 1 ? children[0] : children; // unwrap if singular, forced to be array by ...args
  return { ksp$h: 1, el: null, name, attrs: attrs ?? {}, chs: children.flat(), rchs: rawChildren };
}

export namespace h {
  export import JSX = JSXInternal;
}
