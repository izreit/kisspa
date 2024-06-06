export type Accessor<T> = () => T;
export type AccessorOr<T> = T | Accessor<T>;

export interface Attributes {
  [key: string]: any;
}

// Symbol to distinguish JSXElement (objects created by h() or jsx()) from any other objects.
export const $h = Symbol("ficco-h");

export interface JSXElement {
  [$h]: 1;
  el: Node | null;
  name: string | Component<any, any>;
  attrs: Attributes;
  children: JSXNode[];
}

export type JSXNode = AccessorOr<null | string | number> | JSXElement;
export type Component<P, C extends any> = (props: P & { children: C }) => JSXNode;
