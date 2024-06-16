export type Accessor<T> = () => T;
export type AccessorOr<T> = T | Accessor<T>;

export interface Attributes {
  [key: string]: any;
}

// Symbol to distinguish JSXElement (objects created by h() or jsx()) from any other objects.
export const $h = Symbol("ficco-h");

// Symbol to mark root nodes which is skeleton-assigned but has no Node.
export const $noel = Symbol("ficco-noel");

export interface JSXElement {
  [$h]: 1;
  el: Node | typeof $noel | null;
  name: string | Component<any, any>;
  attrs: Attributes;
  children: JSXNode[];
}

export type JSXNodeSync =
  | null | string | number
  | Accessor<null | string | number>
  | JSXElement;

export type JSXNodeAsync = Promise<JSXNodeSync>;

export type JSXNode =
  | null | string | number
  | Accessor<null | string | number>
  | JSXElement
  | Promise<null | string | number | Accessor<null | string | number> | JSXElement>;

type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };
export type Component<P, C extends any> = (props: OmitNever<P & { children?: C }>) => JSXNode;

export function isJSXElement(v: any): v is JSXElement {
  return v?.[$h];
}

export type Ref<T> = { value: T | null };

export function createRef<T>(): Ref<T> {
  return { value: null };
}

export type PropChildren = JSXNode | JSXNode[] | null;
export type PropRef =
  | Ref<HTMLElement>
  | ((v: HTMLElement) => void)
  | (Ref<HTMLElement> | ((v: HTMLElement) => void))[];
