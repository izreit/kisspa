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
  | undefined | null | string | number | JSXElement | (() => JSXNodeSync);
export type JSXNodeAsyncValue =
  | undefined | null | string | number | JSXElement | (() => JSXNode);
export type JSXNodeAsync = Promise<JSXNodeAsyncValue>;

export type JSXNode =
  | undefined | null | string | number | JSXElement | (() => JSXNode)
  | Promise<undefined | null | string | number | JSXElement | (() => JSXNode)>;

// export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };
export type Component<P> = (props: P) => JSXNode;

export function isJSXElement(v: any): v is JSXElement {
  return v && v.ksp$h;
}

export type Ref<T> = {
  (val: T): unknown;
  value: T;
};

export function createRef<T>(): Ref<T> {
  const ret = (v => (ret.value = v)) as Ref<T>;
  ret.value = null!;
  return ret;
}

export type PropChildren = JSXNode | JSXNode[] | null | undefined;
export type PropRef<T> = ((v: T) => void) | ((v: T) => void)[];

export interface Backing {
  mount(loc: BackingLocation): void;
  tail(): ResolvedBackingLocation | null | undefined;
  dispose(): void;
  name: Node | string;
}

export type ResolvedBackingLocation = [
  /** parent */
  Node | null | undefined,
  /** prev */
  Node | null | undefined,
];

export interface BackingLocation {
  parent: Node | null | undefined;
  prev: Backing | Node | null | undefined;
}

export interface SuspenseContext {
  add_: (p: Promise<void>) => void,
  then_: (onfulfilled: () => void) => void;
}

export interface Refresher {
  register(c: Component<any>, family: string): void;
  resolve<T>(c: Component<T>): Component<T>;
  track<T>(c: Component<T>, backing: Backing, refresh: (c: Component<T>) => Node | Backing): Backing;
}
