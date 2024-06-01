import { autorun, reaction, signal } from "../core";
import { lcs } from "./internal/lcs";

export type AccessorOr<T> = T | (() => T);

export interface Attributes {
  [key: string]: any;
}

// Symbol to distinguish JSXElement (objects created by h()) from any other objects.
const $h = Symbol("ficco-h");

export interface JSXElement {
  [$h]: 1;
  el: Node | null;
  name: string | Component<any, any>;
  attrs: Attributes;
  children: JSXNode[];
}

export type JSXNode = AccessorOr<string | number> | JSXElement;

function isJSXElement(v: any): v is JSXElement {
  return v?.[$h];
}

export type Component<P, C extends any[]> = (props: P & { children: C }) => JSXNode | Backing;

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

export function h(name: string, attrs?: Attributes | null, ...children: JSXNode[]): JSXElement;
export function h<P, C extends any[]>(name: Component<P, C>, attrs?: P, ...children: C): JSXElement;
export function h<P, C extends any[]>(name: string | Component<P, C>, attrs?: Attributes | P | null, ...children: C): JSXElement {
  return { [$h]: 1, name, attrs: attrs ?? {}, el: null, children };
}

function isStrOrNum(v: any): v is number | string {
  return typeof v === "string" || typeof v === "number";
}

interface Skeleton {
  el: Node;
  path: (number | string)[];
}

/**
 * Collect the skeletons for the given JSXNode.
 * IMPORTANT This must be coresspondent with how assemble() consumes skeletons.
 */
function collectSkeletonsImpl(acc: Skeleton[], jnode: JSXNode, parent: Node | null, path: (number | string)[]): void {
  if (typeof jnode === "string" && parent) {
    parent.appendChild(document.createTextNode(""));
    return;
  }

  if (!isJSXElement(jnode) || jnode.el)
    return;
  const { name, attrs, children } = jnode;
  if (typeof name !== "string") {
    for (const [k, v] of Object.entries(attrs))
      collectSkeletonsImpl(acc, v, null, path.concat(k));
    for (let i = 0; i < children.length; ++i)
      collectSkeletonsImpl(acc, children[i], null, path.concat(i));
    return;
  }
  
  const e = document.createElement(name);
  parent?.appendChild(e) ?? acc.push({ el: e, path });
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
    collectSkeletonsImpl(acc, children[i], e, path.concat(i));
}

function collectSkeletons(jnode: JSXNode): Skeleton[] {
  const ret: Skeleton[] = [];
  collectSkeletonsImpl(ret, jnode, null, []);
  return ret;
}

function assignSkeletons(skels: Skeleton[], jnode: JSXNode): void {
  for (let i = 0; i < skels.length; ++i) {
    const { el, path } = skels[i];
    let node = jnode as JSXElement;
    for (let j = 0; j < path.length; ++j) {
      const p = path[j];
      node = (typeof p === "number") ? node.children[p] : node.attrs[p];
    }
    node.el = el;
  }
}

const skelTable: WeakMap<object, Skeleton[]> = new WeakMap();

function allocateSkeletons(jnode: JSXNode, key?: object | null): JSXNode {
  const skels = key
    ? (skelTable.get(key) ?? skelTable.set(key, collectSkeletons(jnode)).get(key)!)
    : collectSkeletons(jnode);
  assignSkeletons(skels, jnode);
  return jnode;
}

function insertAfter(node: Node, parent: Node, prev: Backing | null): void {
  const rawPrev = prev?.lastNode();
  const after = rawPrev ? rawPrev.nextSibling : parent.firstChild;
  parent.insertBefore(node, after);
}

function createSimpleBacking(node: Node): Backing {
  const insert = (pos: Backing.InsertLocation | null | undefined) => {
    if (pos?.parent) {
      insertAfter(node, pos.parent, pos.prev)
    } else {
      node.parentNode?.removeChild(node);
    }
  };
  return { insert, lastNode: () => node!, name: node };
}

const reOn = /^on/;

function assemble(jnode: JSXNode, node?: Node | null, loc?: Backing.InsertLocation | null): Backing {
  const el =
    node ??
    ((typeof jnode === "object")
      ? jnode.el?.cloneNode(true)
      : (console.log("UNCACHED", jnode), document.createTextNode((typeof jnode === "function") ? "" : (jnode + ""))));

  if (el && !el.parentNode && loc?.parent)
    insertAfter(el, loc.parent, loc.prev);
  
  if (typeof jnode !== "object") {
    if (typeof jnode === "function") {
      autorun(() => { el!.nodeValue = jnode() + ""; });
    } else {
      el!.nodeValue = jnode + "";
    }
    return createSimpleBacking(el!);
  }

  const { name, attrs, children } = jnode;
  if (typeof name === "string") {
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === "function") {
        if (reOn.test(k)) {
          (el as any)[k] = v;
        } else {
          autorun(() => { (el as any)[k] = v(); });
        }
      } else if (typeof v === "object" && v) {
        for (const [vk, vv] of Object.entries(v)) {
          if (typeof vv === "function") {
            autorun(() => { (el as any)[k][vk] = vv(); });
          }
        }
      }
    }

    let ch: Node | null = el!.firstChild;
    let chLoc: Backing.InsertLocation = { parent: el!, prev: null };
    for (const v of children) {
      // IMPORTANT This condition, for consuming the skeleton, must be correspondent with collectSkeletons().
      if (typeof v === "string" || (isJSXElement(v) && typeof v.name === "string")) {
        chLoc.prev = assemble(v, ch);
        ch = ch?.nextSibling ?? null;
      } else {
        chLoc.prev = assemble(v, null, chLoc);
      }
    }
    return createSimpleBacking(el!);

  } else {
    const jnodeOrBacking = name({ ...attrs, children });
    if (typeof jnodeOrBacking === "object" && !isJSXElement(jnodeOrBacking)) {
      const backing = jnodeOrBacking;
      backing.insert(loc);
      return backing;
    }
    const jnode = jnodeOrBacking;
    return assemble(allocateSkeletons(jnode, name), null, loc);
  }
}

export function attach(parent: Element, jnode: JSXElement): void {
  assemble(allocateSkeletons(jnode), null, { parent, prev: null });
}

function lastNodeOfBackings(bs: Backing[]): Node | null {
  for (let i = bs.length - 1; i >= 0; --i) {
    const last = bs[i].lastNode();
    if (last)
      return last;
  }
  return null;
}

function insertBackings(bs: Backing[] | null, loc: Backing.InsertLocation | null | undefined): void {
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
    fallback?: JSXNode;
    children: JSXNode[];
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
        children.forEach(c => { thenBackings!.push(assemble(c));});
      }
      insertBackings(thenBackings, loc);
    } else {
      insertBackings(thenBackings, null);
      if (fallback) {
        if (!fallbackBacking)
          fallbackBacking = assemble(fallback);
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
    loc = { ...l };
    toggle(!!l.parent);
  }

  reaction(when, toggle);
  return { insert, lastNode, name: "Show" };
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
        const jnode = fun(e as E, ixSignal[0]);
        b = assemble(allocateSkeletons(jnode, noCache ? null : fun));
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
  
  function insert(l: Backing.InsertLocation): void {
    loc = { ...l };
    insertBackings(backings, loc);
  }

  return {
    insert,
    lastNode: () => lastNodeOfBackings(backings) ?? loc.prev?.lastNode() ?? null,
    name: "For"
  };
}
