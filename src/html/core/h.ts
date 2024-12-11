import { JSXInternal } from "./jsx";
import { $h, type Attributes, type Component, type JSXElement, type JSXNode } from "./types";
import { type Arrayify, arrayify } from "./util";

export function h(name: string, attrs?: JSXInternal.HTMLAttributes | null, ...children: (JSXNode | JSXNode[])[]): JSXElement;
export function h<P extends { children?: any[] }>(name: Component<P>, attrs?: P, ...children: Arrayify<P["children"]>): JSXElement;
export function h<P>(name: string | Component<P>, attrs?: JSXInternal.HTMLAttributes | P | null, ...children: any): JSXElement {
  const rawChildren = children.length === 1 ? children[0] : children; // unwrap if singular, forced to be array by ...args
  return makeJSXElement(name, attrs ?? {}, children, rawChildren);
}

export namespace h {
  export import JSX = JSXInternal;
}

export function jsx(name: string, attrs?: ((JSXInternal.HTMLAttributes & { children?: JSXNode | JSXNode[]; }) | null)): JSXElement;
export function jsx<P>(name: Component<P>, attrs?: P): JSXElement;
export function jsx<P>(
  name: string | Component<P>,
  attrs?: ((JSXInternal.HTMLAttributes & { children?: JSXNode | JSXNode[]; }) | null) | P | null
): JSXElement {
  const a = { ...(attrs ?? {}) } as (Exclude<typeof attrs, null | undefined> & { children?: any });
  delete a.children;
  const cs = attrs && (attrs as any).children;
  return makeJSXElement(name, a, arrayify(cs), cs);
}

export const jsxs = jsx, jsxDEV = jsx, jsxsDEV = jsx;

export function makeJSXElement(name: string | Component<any>, attrs: Attributes, children: any[], rawChildren: any): JSXElement {
  return { [$h]: 1, el: null, name, attrs, children: children.flat(), rawChildren };
}
