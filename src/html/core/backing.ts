import { autorun } from "../../reactive";
import { allocateSkeletons } from "./skeleton";
import { $noel, Component, JSXNode, isJSXElement } from "./types";
import { lastOf } from "./util";

export interface Backing {
  insert(loc: BackingLocation | null | undefined): void;
  tail(): Node | null | undefined;
  dispose(): void;
  name: Node | string;
}

export interface BackingLocation {
  parent: Node | null;
  prev: Backing | Node | null;
}

const nullLocation = { parent: null, prev: null };

export function assignLocation(self: BackingLocation, loc: BackingLocation | null | undefined): boolean {
  const { parent, prev } = loc ?? nullLocation;
  if (self.parent === parent && self.prev === prev) return false;
  self.parent = parent;
  self.prev = prev;
  return true;
}

function isNode(v: any): v is Node {
  return "nodeName" in v;
}

export function tailOf(p: Backing | Node | null | undefined): Node | null | undefined {
  return p ? (isNode(p) ? p : p.tail()) : null;
}

function insertAfter(node: Node, parent: Node, prev: Backing | Node | null): void {
  const rawPrev = tailOf(prev);
  const after = rawPrev ? rawPrev.nextSibling : parent.firstChild;
  parent.insertBefore(node, after);
}

function createNodeBacking(node: Node, disposers: (() => void)[]): Backing {
  const insert = (pos: BackingLocation | null | undefined) => {
    if (pos?.parent) {
      insertAfter(node, pos.parent, pos.prev);
    } else {
      node.parentNode?.removeChild(node);
    }
  };
  const dispose = () => {
    insert(null);
    disposers.forEach(d => d());
  };
  return { insert, dispose, tail: () => node!, name: node };
}

function isPromise(v: any): v is Promise<any> {
  return typeof v?.then === "function";
}

const delayings: Promise<void>[][] = [];

export function collectDelayings<T>(f: () => T): [T, Promise<void>[]] {
  let ret: T;
  let collected: Promise<void>[];
  try {
    delayings.push([]);
    ret = f(); // promises are collected by delayAssemble() which may be called from f().
  } finally {
    collected = delayings.pop()!;
  }
  return [ret, collected];
}

function delayAssemble(jnode: Promise<JSXNode>, l: BackingLocation | null | undefined): Backing {
  let loc: BackingLocation = { parent: null, prev: null };
  let backing: Backing | null = null;
  let disposed = false;

  const p = jnode.then((j) => {
    if (disposed) return;
    backing = assemble(j);
    if (loc)
      backing.insert(loc);
  });

  lastOf(delayings)?.push(p);
  assignLocation(loc, l);

  const insert = (l: BackingLocation | null | undefined): void => {
    assignLocation(loc, l);
    backing?.insert(l);
  };
  const tail = () => backing ? backing.tail() : tailOf(loc?.prev);
  const dispose = () => {
    disposed = true;
    backing?.dispose();
  };
  return { insert, tail, dispose, name: "delay" };
}

export function assembleImpl(jnode: JSXNode): Backing;
export function assembleImpl(jnode: JSXNode, loc?: BackingLocation | null, node?: Node | null): Backing | Node;
export function assembleImpl(jnode: JSXNode, loc?: BackingLocation | null, node?: Node | null): Backing | Node {
  if (isPromise(jnode))
    return delayAssemble(jnode, loc);

  const el =
    node ??
    ((jnode && typeof jnode === "object")
      ? (jnode.el !== $noel ? jnode.el?.cloneNode(true) : null)
      : document.createTextNode((typeof jnode === "function") ? "" : (jnode + "")));

  if (el && !el.parentNode && loc?.parent)
    insertAfter(el, loc.parent, loc.prev);

  if (typeof jnode !== "object" || jnode == null) {
    let disposers: (() => void)[] = [];
    if (typeof jnode === "function") {
      disposers.push(autorun(() => { el!.nodeValue = jnode() + ""; }));
    } else if (jnode != null) {
      el!.nodeValue = jnode + "";
    }
    return createNodeBacking(el!, disposers);
  }

  const { name, attrs, children } = jnode;
  if (typeof name === "string") {
    let disposers: (() => void)[] = [];
    for (let [k, v] of Object.entries(attrs)) {
      k = k.toLowerCase();
      if (typeof v === "function") {
        if (k[0] === "o" && k[1] === "n") {
          (el as any)[k] = v;
        } else {
          disposers.push(autorun(() => { (el as any)[k] = v(); }));
        }
      } else if (typeof v === "object" && v) {
        for (const [vk, vv] of Object.entries(v)) {
          if (typeof vv === "function") {
            disposers.push(autorun(() => { (el as any)[k][vk] = vv(); }));
          }
        }
      }
    }

    let ch: Node | null = el!.firstChild;
    let chLoc: BackingLocation = { parent: el!, prev: null };
    for (const v of children) {
      // IMPORTANT This condition, for consuming the skeleton, must be correspondent with collectSkeletons().
      if (typeof v === "string" || (isJSXElement(v) && !v.el && typeof v.name === "string")) {
        chLoc.prev = assembleImpl(v, null, ch);
        ch = ch?.nextSibling ?? null;
      } else {
        chLoc.prev = assembleImpl(v, chLoc);
      }
    }
    return (node?.parentNode && disposers.length === 0) ? el! : createNodeBacking(el!, disposers);

  } else {
    const special = specials.get(name);
    if (special) {
      const b = special({ ...attrs, children });
      b.insert(loc);
      return b;
    }

    const expanded = name({ ...attrs, children });
    return assembleImpl(allocateSkeletons(expanded, name), loc);
  }
}

export interface LifecycleHandlers {
  onMounts: (() => void)[];
  onCleanups: (() => void)[];
}

export interface LifecycleMethods {
  onMount(f: () => void): void;
  onCleanup(f: () => void): void;
}

let lifecycleContext: [LifecycleHandlers, LifecycleMethods] | null = null;

export function useLifecycleMethods(): LifecycleMethods {
  if (lifecycleContext)
    return lifecycleContext[1];

  const onMounts: (() => void)[] = [];
  const onCleanups: (() => void)[] = [];
  const m: LifecycleMethods = {
    onMount(f) { onMounts.push(f); },
    onCleanup(f) { onCleanups.push(f); },
  };
  lifecycleContext = [{ onMounts, onCleanups }, m];
  return m;
}

export function assemble(jnode: JSXNode): Backing {
  lifecycleContext = null as ([LifecycleHandlers, LifecycleMethods] | null);

  if (isJSXElement(jnode) && !jnode.el)
    allocateSkeletons(jnode);
  const b = assembleImpl(jnode);

  if (!lifecycleContext)
    return b;

  const { onMounts, onCleanups } = lifecycleContext[0];

  // wrap insert() and dispose() to call lifecycle methods if onMount()/onCleanup() is called.
  let mounted = false;
  const insert = (l: BackingLocation | null | undefined): void => {
    b.insert(l);
    if (!mounted && l?.parent) {
      mounted = true;
      // Check the length each time to support onMount() called in onMount()
      for (let i = 0; i < onMounts.length; ++i)
        onMounts[i]();
    }
  };
  const dispose = (): void => {
    b.dispose();
    // Revserse order for notify detach from decendants to ancestors.
    for (let i = onCleanups.length - 1; i >= 0; --i)
      onCleanups[i]();
  };
  return { ...b, insert, dispose };
}

export interface BackingRoot {
  attach(jnode: JSXNode): void;
  detach(): void;
}

export function createRoot(parent: Element): BackingRoot {
  let b: Backing | null = null;
  const attach = (jnode: JSXNode) => {
    b?.dispose();
    b = assemble(jnode);
    b.insert({ parent, prev: null });
    return b;
  };
  const detach = () => {
    b?.dispose();
    b = null;
  };
  return { attach, detach };
}

export function attach(parent: Element, jnode: JSXNode): void {
  createRoot(parent).attach(jnode);
}

export function tailOfBackings(bs: Backing[] | null | undefined, prev?: Backing | Node | null): Node | null | undefined {
  if (bs) {
    for (let i = bs.length - 1; i >= 0; --i) {
      const t = bs[i].tail();
      if (t)
        return t;
    }
  }
  return tailOf(prev);
}

export function insertBackings(bs: Backing[] | null, loc: BackingLocation | null | undefined): void {
  if (!bs) return;
  if (loc?.parent) {
    const parent = loc.parent;
    bs.reduce((prev, b) => (b.insert({ parent, prev }), b), loc.prev);
  } else {
    bs.forEach(b => b.insert(null));
  }
}

export function disposeBackings(bs: Backing[] | null): void {
  bs?.forEach(b => b.dispose());
}

const specials: WeakMap<Component<any, any>, (props: any) => Backing> = new WeakMap();

export type MemberType<P, Key> = Key extends keyof P ? P[Key] : never;

export function createSpecial<P>(impl: (props: P) => Backing): Component<P, MemberType<P, "children">> {
  const ret: Component<P, MemberType<P, "children">> = () => 0; // Dummy. Never called but must be unique for each call.
  specials.set(ret, impl);
  return ret;
}
