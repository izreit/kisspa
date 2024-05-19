import { autorun, memoize } from "../core";

export type AccessorOr<T> = T | (() => T);

export interface Dict {
  [key: string]: AccessorOr<string>;
}

export interface Attributes {
  [key: string]: any;
}

export interface HLit {
  val: AccessorOr<string | number>;
  el: Node | null;
}

export interface HElement {
  name: string | Component<any>;
  attrs: Attributes;
  children: (HLit | HElement)[];
  el: Node | null;
}

export type HNode = HLit | HElement;
export type JSXElement = AccessorOr<string | number> | HElement;

export interface Backing {
  prev: Backing | null;
  parent: Node;
  lastNode(): Node | null;
}

export interface Component<P> {
  (props: P): HElement;
  assemble?(hnode: JSXElement, parent: Node, prev: Backing | null): Backing;
}

export function h<P>(name: string | Component<P>, attrs?: P | null, ...children: JSXElement[]): HElement {
  const cs = children.map(c => (typeof c === "object") ? c : { val: c, el: null });
  return { name, attrs: attrs ?? {}, el: null, children: cs };
}

function isStrOrNum(v: any): v is number | string {
  return typeof v === "string" || typeof v === "number";
}

function collectSkeletons(hnode: HNode, parent: Node | null, result: Node[]): Node[] {
  if (hnode.el) // already assigned a skeleton, which means this hnode belongs an ancestor component in the tree.
    return result;

  if ("val" in hnode) {
    const e = document.createTextNode(typeof hnode.val === "function" ? "" : hnode.val + "");
    parent?.appendChild(e) ?? result.push(e);
    return result;
  }

  const { name, attrs, children } = hnode;
  if (typeof name !== "string") {
    for (let i = 0; i < children.length; ++i)
      collectSkeletons(children[i], null, result);
    return result;
  }

  const e = document.createElement(name);
  parent?.appendChild(e) ?? result.push(e);
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

  for (let i = 0; i < children.length; ++i)
    collectSkeletons(children[i], e, result);
  return result;
}

function assignSkeletons(hnode: HNode, skels: Node[], top: boolean = true, index: number = 0) {
  if (top && !("name" in hnode && typeof hnode.name === "function"))
    hnode.el = skels[index++];
  if ("val" in hnode)
    return;
  const { name, children } = hnode;
  top = typeof name !== "string";
  for (let i = 0; i < children.length; ++i)
    assignSkeletons(children[i], skels, top, index);
} 

/*
function createSkeleton(hnode: JSXElement): Node | null {
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
*/

const reOn = /^on/;

const skelTable: WeakMap<object, Node[]> = new WeakMap();

function skeletonsOf(hnode: HNode, key: object): Node[] {
  return skelTable.get(key) ?? skelTable.set(key, collectSkeletons(hnode, null, [])).get(key)!;
}

export function assemble(hnode: HNode, parent: Node, prev: Backing | null, skeleton: Node | null): Backing {
  const skel = skeleton ?? hnode.el?.cloneNode(true);

  if (skel && !skel.parentNode)
    parent.insertBefore(skel, prev?.lastNode()?.nextSibling ?? null);

  if ("val" in hnode) {
    const { val } = hnode;
    if (typeof val !== "function") {
      return { prev, parent, lastNode: () => skel! };
    } else {
      autorun(() => { skel!.nodeValue = val() + "" });
      return { prev, parent, lastNode: () => skel! };
    }
  }

  const { name, attrs, children } = hnode;
  if (typeof name === "string") {
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === "function") {
        if (reOn.test(k)) {
          (skel as any)[k] = v;
        } else {
          autorun(() => { (skel as any)[k] = v(); });
        }
      } else if (typeof v === "object" && v) {
        for (const [vk, vv] of Object.entries(v)) {
          if (typeof vv === "function") {
            autorun(() => { (skel as any)[k][vk] = vv(); });
          }
        }
      }
    }

    let skelCh = skel!.firstChild;
    for (const v of children) {
      if ("val" in v || typeof v.name === "string") {
        prev = assemble(v, skel!, prev, skelCh);
        skelCh = skelCh!.nextSibling;
      } else {
        prev = assemble(v, skel!, prev, null);
      }
    }
    return { prev, parent, lastNode: () => skel! };

  } else {
    const hn = name({ ...attrs, children });
    if (typeof name !== "string" && name.assemble)
      return name.assemble(hn, parent, prev);
    
    assignSkeletons(hn, skeletonsOf(hn, name));
    return assemble(hn, parent, prev, null);
  }
}

export function attach(parent: Element, hnode: HNode): void {
  assignSkeletons(hnode, collectSkeletons(hnode, null, []));
  assemble(hnode, parent, null, null);
}
