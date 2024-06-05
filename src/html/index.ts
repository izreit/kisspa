import { autorun, reaction, signal } from "../core";
import { lcs } from "./internal/lcs";
import { JSXInternal } from "./jsx";
import { $h, Backing, Component, JSXElement, JSXNode } from "./types";

export * from "./types";
export type { JSXInternal as JSX };

export function isJSXElement(v: any): v is JSXElement {
  return v?.[$h];
}

export function h(name: string, attrs?: JSXInternal.HTMLAttributes | null, ...children: (JSXNode | JSXNode[])[]): JSXElement;
export function h<P, C extends any[]>(name: Component<P, C>, attrs?: P, ...children: C): JSXElement;
export function h<P, C extends any[]>(name: string | Component<P, C>, attrs?: JSXInternal.HTMLAttributes | P | null, ...children: C): JSXElement {
  return { [$h]: 1, name, attrs: attrs ?? {}, el: null, children: children.flat() };
}

export namespace h {
  export import JSX = JSXInternal;
}

export function jsx(name: string, attrs?: (JSXInternal.HTMLAttributes & { children?: JSXNode | JSXNode[] } | null)): JSXElement;
export function jsx<P extends { children?: any }>(name: Component<Omit<P, "children">, P["children"]>, attrs?: P): JSXElement;
export function jsx<P extends { children?: any }>(
  name: string | Component<Omit<P, "children">, P["children"]>,
  attrs?: (JSXInternal.HTMLAttributes & { children?: (JSXNode | JSXNode[])[] } | null) | P | null)
: JSXElement {
  return { [$h]: 1, name, attrs: attrs ?? {}, el: null, children: attrs?.children.flat() };
}

export const jsxs = jsx;

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
  const rawPrev = prev?.tail();
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
  return { insert, tail: () => node!, name: node };
}

function assemble(jnode: JSXNode, node?: Node | null, loc?: Backing.InsertLocation | null): Backing {
  const el =
    node ??
    ((jnode && typeof jnode === "object")
      ? jnode.el?.cloneNode(true)
      : (console.log("UNCACHED", jnode), document.createTextNode((typeof jnode === "function") ? "" : (jnode + ""))));

  if (el && !el.parentNode && loc?.parent)
    insertAfter(el, loc.parent, loc.prev);
  
  if (typeof jnode !== "object" || jnode == null) {
    if (typeof jnode === "function") {
      autorun(() => { el!.nodeValue = jnode() + ""; });
    } else if (jnode != null) {
      el!.nodeValue = jnode + "";
    }
    return createSimpleBacking(el!);
  }

  const { name, attrs, children } = jnode;
  if (typeof name === "string") {
    for (let [k, v] of Object.entries(attrs)) {
      k = k.toLowerCase();
      if (typeof v === "function") {
        if (k[0] === "o" && k[1] === "n") {
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
      if (typeof v === "string" || (isJSXElement(v) && !v.el && typeof v.name === "string")) {
        chLoc.prev = assemble(v, ch);
        ch = ch?.nextSibling ?? null;
      } else {
        chLoc.prev = assemble(v, null, chLoc);
      }
    }
    return createSimpleBacking(el!);

  } else {
    const special = specials.get(name);
    if (special) {
      const b = special({ ...attrs, children }, loc);
      b.insert(loc);
      return b;
    }

    const expanded = name({ ...attrs, children });
    return assemble(allocateSkeletons(expanded, name), null, loc);
  }
}

export function attach(parent: Element, jnode: JSXElement): void {
  assemble(allocateSkeletons(jnode), null, { parent, prev: null });
}

function tailOfBackings(bs: Backing[], prev?: Backing | null): Node | null {
  for (let i = bs.length - 1; i >= 0; --i) {
    const t = bs[i].tail();
    if (t)
      return t;
  }
  return prev?.tail() ?? null;
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

const specials: WeakMap<Component<any, any>, (props: any, loc?: Backing.InsertLocation | null) => Backing> = new WeakMap();

export function specialize<P extends { children?: any }>(
  impl: (props: P, loc?: Backing.InsertLocation | null) => Backing
): Component<P, P["children"]> {
  const ret: Component<P, P["children"]> = () => ""; // Dummy. Never called.
  specials.set(ret, impl);
  return ret;
}

export namespace Show {
  export interface Props {
    when: () => boolean;
    fallback?: JSXNode;
    children?: JSXNode[];
  }
}

export const Show = specialize(function Show(props: Show.Props): Backing {
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

  function tail(): Node | null {
    if (showing) {
      return (thenBackings && tailOfBackings(thenBackings)) ?? loc?.prev?.tail() ?? null;
    } else {
      return fallbackBacking?.tail() ?? loc?.prev?.tail() ?? null;
    }
  }

  function insert(l: Backing.InsertLocation): void {
    loc = { ...l };
    toggle(!!l.parent);
  }

  reaction(when, toggle);
  return { insert, tail, name: "Show" };
});

export namespace For {
  export interface Props<E> {
    each: () => E[];
    key?: (el: E, ix: number) => any;
    noCache?: boolean;
    children: [(el: E, i: () => number) => JSXElement];
  }
}

export const For = specialize(function For<E>(props: For.Props<E>): Backing {
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
    backingTable.forEach(_b => { /* clean up autorun */});
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
    tail: () => tailOfBackings(backings, loc.prev),
    name: "For"
  };
});

export interface ContextProviderProps<T> {
  value: T;
  children?: JSXNode | JSXNode[] | null;
}

export type ContextPair<T> = [
  Component<ContextProviderProps<T>, ContextProviderProps<T>["children"]>,
  () => T,
];

export function arrayify<T>(v: NonNullable<T> | T[] | null | undefined): T[] | null | undefined {
  return Array.isArray(v) ? v : (v != null ? [v] : (v as null | undefined));
}

export function createContext<T>(initial: T): ContextPair<T> {
  const stack: T[] = [initial];

  const Provider = specialize<ContextProviderProps<T>>(function Provider(props: ContextProviderProps<T>): Backing {
    let bs: Backing[];
    try {
      stack.push(props.value);
      bs = arrayify(props.children)?.map(c => assemble(c)) ?? [];
    } finally {
      stack.pop();
    }

    let loc: Backing.InsertLocation | null = null;
    return {
      insert: (l: Backing.InsertLocation) => {
        loc = { ...l };
        insertBackings(bs, loc);
      },
      tail: () => tailOfBackings(bs, loc?.prev),
      name: "Ctx"
    };
  });

  function use(): T {
    return stack[stack.length - 1]!;
  }

  return [Provider, use];
}
