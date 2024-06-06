import { JSXInternal } from "./jsx";
import { $h, Component, JSXElement, JSXNode } from "./types";

export function h(name: string, attrs?: JSXInternal.HTMLAttributes | null, ...children: (JSXNode | JSXNode[])[]): JSXElement;
export function h<P, C extends any[]>(name: Component<P, C>, attrs?: P, ...children: C): JSXElement;
export function h<P, C extends any[]>(name: string | Component<P, C>, attrs?: JSXInternal.HTMLAttributes | P | null, ...children: C): JSXElement {
  return { [$h]: 1, name, attrs: attrs ?? {}, el: null, children: children.flat() };
}

export namespace h {
  export import JSX = JSXInternal;
}

export function jsx(name: string, attrs?: ((JSXInternal.HTMLAttributes & { children?: JSXNode | JSXNode[]; }) | null)): JSXElement;
export function jsx<P extends { children?: any; }>(name: Component<Omit<P, "children">, P["children"]>, attrs?: P): JSXElement;
export function jsx<P extends { children?: any; }>(
  name: string | Component<Omit<P, "children">, P["children"]>,
  attrs?: ((JSXInternal.HTMLAttributes & { children?: (JSXNode | JSXNode[])[]; }) | null) | P | null): JSXElement {
  return { [$h]: 1, name, attrs: attrs ?? {}, el: null, children: attrs?.children.flat() };
}

export const jsxs = jsx;
