import { autorun, reaction, signal } from "../core";
import { lcs } from "./internal/lcs";

export type AccessorOr<T> = T | (() => T);

export interface Attributes {
  [key: string]: any;
}

const $hSym = Symbol("ficco-h");

export interface HLit {
  [$hSym]: number;
  el: Node | null;
  val: AccessorOr<string | number>;
}

export interface HElement {
  [$hSym]: 1;
  el: Node | null;
  name: string | Component<any, any>;
  attrs: Attributes;
  children: (HLit | HElement)[];
}

export type HNode = HLit | HElement;
export type JSXElement = AccessorOr<string | number> | HElement;

export namespace Backing {
  export type InsertLocation = {
    parent: Node | null;
    prev: Backing | null;
  };
}

export interface Backing {
  lastNode(): Node | null;
  insert(loc: Backing.InsertLocation | null): void;
  // attach(parent: Node, prev: Backing | null): void;
  // detach(): void;
}

export type Component<P, C extends any[]> = (props: P & { children: C }) => HNode | Backing;

export function toHNode(e: JSXElement): HNode {
  return (typeof e === "object") ? e : { [$hSym]: 1, val: e, el: null };
}

export function h(name: string, attrs?: Attributes | null, ...children: JSXElement[]): HElement;
export function h<P, C extends any[]>(name: Component<P, C>, attrs?: P, ...children: C): HElement;
export function h<P, C extends any[]>(name: string | Component<P, C>, attrs?: Attributes | P | null, ...children: C): HElement {
  return {
    [$hSym]: 1,
    name,
    attrs: attrs ?? {},
    el: null,
    children: children.map(toHNode),
  };
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
    for (const v of Object.values(attrs)) {
      if (v?.[$hSym])
        collectSkeletons(v, null, result);
    }
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

function setSkeletons(hnode: HNode, skels: Node[], top: boolean = true, index: number = 0): number {
  // NOTE this function must assign skeltons in **the same order** as collectSkeletons().
  // This process can only depend on order because skeletons are reused for multiple HNodes...
  if (top && !("name" in hnode && typeof hnode.name === "function"))
    hnode.el = skels[index++];
  if ("val" in hnode)
    return index;

  const { name, attrs, children } = hnode;
  if (typeof name !== "string") {
    for (const v of Object.values(attrs)) {
      if (v?.[$hSym])
        index = setSkeletons(v, skels, true, index);
    }
    for (let i = 0; i < children.length; ++i)
      index = setSkeletons(children[i], skels, true, index);
    return index;
  }

  for (let i = 0; i < children.length; ++i)
    index = setSkeletons(children[i], skels, false, index);
  return index;
} 

const reOn = /^on/;
const skelTable: WeakMap<object, Node[]> = new WeakMap();

function skeletonsOf(hnode: HNode, key: object): Node[] {
  return skelTable.get(key) ?? skelTable.set(key, collectSkeletons(hnode, null, [])).get(key)!;
}

function assignSkeletons(hnode: HNode, key?: object | null): HNode {
  const skels = key ? skeletonsOf(hnode, key) : collectSkeletons(hnode, null, []);
  setSkeletons(hnode, skels);
  return hnode;
}

function createSimpleBacking(node: Node): Backing {
  // const detach = () => node.parentNode?.removeChild(node);
  // const attach = (parent: Node, prev: Backing | null) => parent.insertBefore(node, prev?.lastNode()?.nextSibling ?? null);
  const insert = (pos: Backing.InsertLocation | null) => {
    const { parent, prev } = pos ?? { parent: null, prev: null };
    if (parent) {
      parent.insertBefore(node, prev?.lastNode()?.nextSibling ?? null);
    } else {
      node.parentNode?.removeChild(node);
    }
  };
  return { insert, lastNode: () => node! };
}

export function assemble(hnode: HNode, skeleton?: Node | null, parent?: Node | null, prev: Backing | null = null): Backing {
  const skel =
    // skel, the actual node for this hnode, is given when it's a non-root element of a skeleton,
    skeleton ??
    // created (by cloning) here when it's the root element of a skeleton,
    hnode.el?.cloneNode(true) ??
    (!("val" in hnode) ?
      // nothing when it's a Component which has no node itself, or
      null :
      // created here when it's an uncached HNode originated to JSXElement props of MetaComponent.
      // Because non-HNode props can't be (and unnecessary to be) detected by collectSkeletons().
      // Since here hnode is always string, number or function returns them (i.e. not an HElement
      // by the definition of JSXElement), just a text node is required here.
      document.createTextNode((typeof hnode.val === "function") ? "" : (hnode.val + "")));

  if (skel && !skel.parentNode)
    parent?.insertBefore(skel, prev?.lastNode()?.nextSibling ?? null);

  if ("val" in hnode) {
    const { val } = hnode;
    if (typeof val === "function")
      autorun(() => { skel!.nodeValue = val() + "" });
    return createSimpleBacking(skel!);
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

    let skelCh: Node | null = skel!.firstChild;
    for (const v of children) {
      if ("val" in v || typeof v.name === "string") {
        prev = assemble(v, skelCh);
        skelCh = skelCh?.nextSibling ?? null;
      } else {
        prev = assemble(v, null, skel!, prev);
      }
    }
    return createSimpleBacking(skel!);

  } else {
    const hnodeOrBacking = name({ ...attrs, children });
    if (!($hSym in hnodeOrBacking)) {
      const backing = hnodeOrBacking;
      if (parent)
        backing.insert({ parent, prev });
      return backing;
    }

    const hn = hnodeOrBacking;
    return assemble(assignSkeletons(hn, name), null, parent, prev);
  }
}

export function attach(parent: Element, e: JSXElement): void {
  const hnode = toHNode(e);
  setSkeletons(hnode, collectSkeletons(hnode, null, []));
  assemble(hnode, null, parent, null);
}

function lastNodeOfBackings(bs: Backing[]): Node | null {
  for (let i = bs.length - 1; i >= 0; --i) {
    const last = bs[i].lastNode();
    if (last)
      return last;
  }
  return null;
}

function insertBackings(bs: Backing[] | null, loc: Backing.InsertLocation | null): void {
  if (!bs) return;
  if (!loc?.parent) {
    bs.forEach(b => b.insert(null));
    return;
  }
  const l = { ...loc };
  bs.forEach(b => {
    b.insert(l);
    l.prev = b;
  });
}

export namespace Show {
  export interface Props {
    when: () => boolean;
    fallback?: JSXElement;
    children: JSXElement[];
  }
}

export function Show(props: Show.Props): Backing {
  const { when, fallback } = props;
  const children = props.children ?? [];
  let thenBackings: Backing[] | null = null;
  let fallbackBacking: Backing | null = null;
  let showing = false;
  let loc: Backing.InsertLocation = { parent: null, prev: null };
 
  function toggle(show: boolean): void {
    if (showing === show) return;
    showing = show;
    if (!parent) return;

    if (show) {
      fallbackBacking?.insert(null);
      if (!thenBackings) {
        thenBackings = [];
        children.forEach(c => { thenBackings!.push(assemble(toHNode(c), null));});
      }
      insertBackings(thenBackings, loc);
    } else {
      insertBackings(thenBackings, null);
      if (fallback) {
        if (!fallbackBacking)
          fallbackBacking = assemble(toHNode(fallback), null);
        fallbackBacking.insert(loc);
      }
    }
  }

  function lastNode(): Node | null {
    if (showing) {
      return (thenBackings && lastNodeOfBackings(thenBackings)) ?? loc?.prev?.lastNode() ?? null;
    } else {
      return fallbackBacking?.lastNode() ?? loc?.prev?.lastNode() ?? null;
    }
  }

  function insert(l: Backing.InsertLocation): void {
    loc = l;
    toggle(!!l.parent);
  }

  reaction(when, toggle);
  return { insert, lastNode };
}

export namespace For {
  export interface Props<E> {
    each: () => E[];
    key?: (el: E, ix: number) => any;
    noCache?: boolean;
    children: [(el: E, i: () => number) => JSXElement];
  }
}

export function For<E>(props: For.Props<E>): Backing {
  const { each, key, noCache, children: [fun] } = props;

  let backings: Backing[] = [];
  let backingTable: Map<any, Backing> = new Map();
  let ixTable: WeakMap<Backing, [() => number, (v: number) => void]> = new WeakMap();
  let loc: Backing.InsertLocation = { parent: null, prev: null };

  autorun(() => {
    const nextTable: Map<any, Backing> = new Map();
    const nextBackings = each().map((e, i) => {
      const k = key?.(e, i) ?? e;
      let b = backingTable.get(k);
      if (b) {
        backingTable.delete(k);
      } else {
        const ixSignal = signal(i);
        const hn = toHNode(fun(e as E, ixSignal[0]));
        b = assemble(assignSkeletons(hn, noCache ? null : fun));
        ixTable.set(b, ixSignal);
      }
      nextTable.set(k, b);
      return b;
    });
    backingTable.forEach(b => { /* clean up autorun */});
    backingTable.clear();
    backingTable = nextTable;

    if (!loc.parent) {
      backings = nextBackings;
      return;
    }

    let ci = 0;
    let ni = 0;
    let l = { ...loc };
    const commonBackings = lcs(backings, nextBackings);
    for (let cmi = 0; cmi < commonBackings.length; ++cmi) {
      const commonBacking = commonBackings[cmi];
      for (let cb = backings[ci]; ci < backings.length && backings[ci] !== commonBacking; ++ci, cb = backings[ci])
        cb.insert(null);
      for (let nb = nextBackings[ni]; ni < nextBackings.length && nb !== commonBacking; ++ni, nb = nextBackings[ni]) {
        nb.insert(l);
        l.prev = nb;
      }
      l.prev = commonBacking;
    }
    for (let cb = backings[ci]; ci < backings.length; ++ci, cb = backings[ci])
      cb.insert(null);
    for (let nb = nextBackings[ni]; ni < nextBackings.length; ++ni, nb = nextBackings[ni]) {
      nb.insert(l);
      l.prev = nb;
    }
  });
  
  return {
    insert: loc => insertBackings(backings, loc),
    lastNode: () => lastNodeOfBackings(backings) ?? loc.prev?.lastNode() ?? null
  };
}
