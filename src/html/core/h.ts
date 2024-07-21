import { JSXInternal } from "./jsx";
import { $h, Attributes, Component, JSXElement, JSXNode } from "./types";

export function h(name: string, attrs?: JSXInternal.HTMLAttributes | null, ...children: (JSXNode | JSXNode[])[]): JSXElement;
export function h<P, C extends any[]>(name: Component<P, C>, attrs?: P, ...children: C): JSXElement;
export function h<P, C extends any[]>(name: string | Component<P, C>, attrs?: JSXInternal.HTMLAttributes | P | null, ...children: C): JSXElement {
  return makeJSXElement(name, attrs ?? {}, children);
}

export namespace h {
  export import JSX = JSXInternal;
}

export function jsx(name: string, attrs?: ((JSXInternal.HTMLAttributes & { children?: JSXNode | JSXNode[]; }) | null)): JSXElement;
export function jsx<P extends { children?: any; }>(name: Component<Omit<P, "children">, P["children"]>, attrs?: P): JSXElement;
export function jsx<P extends { children?: any; }>(
  name: string | Component<Omit<P, "children">, P["children"]>,
  attrs?: ((JSXInternal.HTMLAttributes & { children?: (JSXNode | JSXNode[])[]; }) | null) | P | null
): JSXElement {
  const a = { ...(attrs ?? {}) } as Exclude<typeof attrs, null | undefined>;
  delete a.children;
  return makeJSXElement(name, a, attrs?.children);
}

export const jsxs = jsx;

export function makeJSXElement(name: string | Component<any, any>, attrs: Attributes, children: any[]): JSXElement {
  const rawChildren = children.length === 1 ? children[0] : children; // unwrap if singular, forced to be array by ...args
  return { [$h]: 1, el: null, name, attrs, children: children.flat(), rawChildren };
}
