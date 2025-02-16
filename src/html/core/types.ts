export type Accessor<T> = () => T;
export type AccessorOr<T> = T | Accessor<T>;

export interface Attributes {
  [key: string]: any;
}

// Marker for root nodes which is skeleton-assigned but has no Node.
export const $noel = "ksp$noel" as const;

export interface JSXElement {
  /**
   * (internal) Marker to distinguish JSXElement from any other objects.
   */
  ksp$h: 1;

  /**
   * (internal) Assigned skeleton node.
   * null for not assigned yet, $noel for no need to assign (i.e. a component).
   */
  el: Node | typeof $noel | null;

  name: string | Component<any>;
  attrs: Attributes;

  /**
   * Normalized (flattened) children.
   */
  chs: JSXNode[];

  /**
   * Raw children as it given. Used to pass to the component as props.
   */
  rchs: any;
}

export type JSXNodeSync =
  | null | string | number | JSXElement | (() => JSXNodeSync);

export type JSXNodeAsyncValue = null | string | number | JSXElement | (() => JSXNode);
export type JSXNodeAsync = Promise<JSXNodeAsyncValue>;

export type JSXNode =
  | null | string | number | JSXElement | (() => JSXNode)
  | Promise<null | string | number | JSXElement | (() => JSXNode)>;

// export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };
export type Component<P> = (props: P) => JSXNode;

export function isJSXElement(v: any): v is JSXElement {
  return v && v.ksp$h;
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
