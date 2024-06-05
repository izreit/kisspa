export type Accessor<T> = () => T;
export type AccessorOr<T> = T | Accessor<T>;

export namespace Backing {
  export type InsertLocation = {
    parent: Node | null;
    prev: Backing | null;
  };
}

export interface Backing {
  lastNode(): Node | null;
  insert(loc: Backing.InsertLocation | null | undefined): void;
  name: Node | string;
}

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

export interface JSXRawElement extends JSXElement {
  children: JSXRawNode[];
} 

export type JSXRawNode = AccessorOr<string | number> | JSXRawElement;
export type JSXNode = JSXRawNode | Backing;
export type Component<P, C extends any> = (props: P & { children: C }) => JSXNode;
