import { autorun, memoize } from "../core";

export type AccessorOr<T> = T | (() => T);

export interface Dict {
  [key: string]: AccessorOr<string>;
}

export interface Attributes {
  [key: string]: any;
}

export interface JSXElement {
  name: string | Component<any>;
  attrs: Attributes;
  children: (AccessorOr<string | number> | JSXElement)[];
}

export type HNode = AccessorOr<string | number> | JSXElement;

export interface Backing {
  prev: Backing | null;
  parent: Node;
  lastNode(): Node | null;
}

export interface Component<P> {
  (props: P): JSXElement;
  assemble?(hnode: HNode, parent: Node, prev: Backing | null): Backing;
}

export function h<P>(name: string | Component<P>, attrs?: P | null, ...children: HNode[]): JSXElement {
  return { name, attrs: attrs ?? {}, children };
}

function isStrOrNum(v: any): v is number | string {
  return typeof v === "string" || typeof v === "number";
}

function createSkeleton(hnode: HNode): Node | null {
  if (isStrOrNum(hnode))
    return document.createTextNode(hnode + "");
  if (typeof hnode === "function")
    return document.createTextNode("");
  const { name, attrs, children } = hnode;
  if (typeof name !== "string") return null;
  const e = document.createElement(name);

  for (const [k, v] of Object.entries(attrs)) {
    if (isStrOrNum(v)) {
      (e as any)[k] = v;
    } else if (typeof v === "object" && v) {
      for (const [vk, vv] of Object.entries(v)) {
        if (isStrOrNum(vv))
          (e as any)[k][vk] = vv;
      }
    }
  }

  for (let i = 0; i < children.length; ++i) {
    const skel = createSkeleton(children[i]);
    if (skel)
      e.appendChild(skel);
  }
  return e;
}

const nodeCache: WeakMap<Function, Node> = new WeakMap();
const reOn = /^on/;

export function assemble(hnode: HNode, parent: Node, prev: Backing | null, skeleton: Node | null): Backing {
  if (skeleton && !skeleton.parentNode)
    parent.insertBefore(skeleton, prev?.lastNode()?.nextSibling ?? null);

  if (isStrOrNum(hnode))
    return { prev, parent, lastNode: () => skeleton };
  if (typeof hnode === "function") {
    autorun(() => { skeleton!.nodeValue = hnode() + "" });
    return { prev, parent, lastNode: () => skeleton };
  }

  const { name, attrs, children } = hnode;
  if (typeof name === "string") {
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === "function") {
        if (reOn.test(k)) {
          (skeleton as any)[k] = v;
        } else {
          autorun(() => { (skeleton as any)[k] = v(); });
        }
      } else if (typeof v === "object" && v) {
        for (const [vk, vv] of Object.entries(v)) {
          if (typeof vv === "function") {
            autorun(() => { (skeleton as any)[k][vk] = vv(); });
          }
        }
      }
    }

    let skel = skeleton!.firstChild;
    for (const v of children) {
      if (isStrOrNum(v) || typeof v === "function" || typeof v.name === "string") {
        prev = assemble(v, skeleton!, prev, skel);
        skel = skel!.nextSibling;
      } else {
        prev = assemble(v, skeleton!, prev, null);
      }
    }
    return { prev, parent, lastNode: () => skeleton };

  } else {
    const hn = name({ ...attrs, children });
    if (typeof name !== "string" && name.assemble)
      return name.assemble(hn, parent, prev);
    const skel = (nodeCache.get(name) ?? nodeCache.set(name, createSkeleton(hn)!).get(name))?.cloneNode(true) ?? null;
    return assemble(hn, parent, prev, skel);
  }
}

export function attach(parent: Element, hnode: HNode): void {
  assemble(hnode, parent, null, createSkeleton(hnode));
}
