import { autorun } from "../../reactive";
import { allocateSkeletons } from "./skeleton";
import { $noel, Component, JSXNode, Ref, isJSXElement } from "./types";
import { arrayify, lastOf } from "./util";

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

export function createLocation(parent: Node | null = null, prev: Backing | Node | null = null): BackingLocation {
  return { parent, prev };
}

const nullLocation = createLocation();

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

const doNothing = () => {};

function createNodeBackingIfNeeded(node: Node, disposers: (() => void)[], staticParent: boolean): Backing | Node {
  const tail = () => node;

  if (staticParent) {
    if (disposers.length === 0)
      return node;
    const dispose = (disposers.length === 1) ? disposers[0] : () => disposers.forEach(d => d());
    return { insert: doNothing, dispose, tail, name: node };
  }

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
  return { insert, dispose, tail, name: node };
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
  let loc = createLocation();
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

function resolveRef(el: HTMLElement, r: Ref<HTMLElement> | ((e: HTMLElement) => void)): void {
  (typeof r === "function") ? r(el) : (r.value = el);
}

function assignAttribute(el: HTMLElement, k: string, v: string | null): void {
  (v != null) ? el.setAttribute(k, v) : el.removeAttribute(k);
}

function assembleImpl(jnode: JSXNode): Backing;
function assembleImpl(jnode: JSXNode, loc?: BackingLocation | null, node?: Node | null): Backing | Node;
function assembleImpl(jnode: JSXNode, loc?: BackingLocation | null, node?: Node | null): Backing | Node {
  if (isPromise(jnode))
    return delayAssemble(jnode, loc);

  const staticParent = !!node?.parentNode;
  const el =
    node ??
    ((jnode && typeof jnode === "object") ?
      (jnode.el !== $noel ? jnode.el?.cloneNode(true) : null) :
      document.createTextNode((typeof jnode === "function") ? "" : (jnode + "")));

  if (el && !el.parentNode && loc?.parent)
    insertAfter(el, loc.parent, loc.prev);

  if (typeof jnode !== "object" || jnode == null) {
    let disposers: (() => void)[] = [];
    if (typeof jnode === "function") {
      disposers.push(autorun(() => { el!.nodeValue = jnode() + ""; }));
    } else if (jnode != null) {
      el!.nodeValue = jnode + "";
    }
    return createNodeBackingIfNeeded(el!, disposers, staticParent);
  }

  const { name, attrs, children } = jnode;
  if (typeof name === "string") {
    let refVal: (Ref<HTMLElement> | ((v: HTMLElement) => void))[] | null = null;
    const disposers: (() => void)[] = [];

    for (let [k, v] of Object.entries(attrs)) {
      if (k === "ref" && v) {
        refVal = arrayify(v);
        continue;
      }

      if (typeof v === "function") {
        if (k[0] === "o" && k[1] === "n") {
          (el as any)[k.toLowerCase()] = v;
        } else {
          disposers.push(autorun(() => { assignAttribute(el as HTMLElement, k, v()); }));
        }
      } else if (typeof v === "object" && v) {
        for (const [vk, vv] of Object.entries(v)) {
          if (typeof vv === "function") {
            disposers.push(autorun(() => { (el as any)[k][vk] = vv(); }));
          }
        }
      }
    }

    let skelCh: Node | null = el!.firstChild;
    let chLoc = createLocation(el!);
    for (const v of children) {
      let ch: Backing | Node;
      // IMPORTANT This condition, for consuming the skeleton, must be correspondent with collectSkeletons().
      if (typeof v === "string" || (isJSXElement(v) && !v.el && typeof v.name === "string")) {
        ch = assembleImpl(v, null, skelCh);
        skelCh = skelCh?.nextSibling ?? null;
      } else {
        ch = assembleImpl(v, chLoc);
      }
      chLoc.prev = ch;
      if (!isNode(ch))
        disposers.push(ch.dispose);
    }

    if (refVal)
      refVal.forEach(r => resolveRef(el as HTMLElement, r));

    return createNodeBackingIfNeeded(el!, disposers, staticParent);

  } else if (specials.has(name)) {
    const special = specials.get(name)!;
    const b = special({ ...attrs, children });
    b.insert(loc);
    return b;

  } else {
    const expanded = name({ ...attrs, children });
    return assembleImpl(allocateSkeletons(expanded, name), loc);
  }
}

interface ComponentMethodState {
  onMounts: (() => void)[];
  onCleanups: (() => void)[];
}

export interface ComponentMethods {
  onMount: (f: () => void) => void;
  onCleanup: (f: () => void) => void;
  reaction: (f: () => void) => void;
}

const componentContexts: ([ComponentMethodState, ComponentMethods] | null)[] = [];

export function useComponentMethods(): ComponentMethods {
  const last = componentContexts.length - 1;
  const cctx = componentContexts[last];
  if (cctx)
    return cctx[1];

  const onMounts: (() => void)[] = [];
  const onCleanups: (() => void)[] = [];
  const m: ComponentMethods = {
    onMount(f) { onMounts.push(f); },
    onCleanup(f) { onCleanups.push(f); },
    reaction(f) { onCleanups.push(autorun(f)); },
  };
  componentContexts[last] = [{ onMounts, onCleanups }, m];
  return m;
}

export function assemble(jnode: JSXNode): Backing {
  componentContexts.push(null);

  if (isJSXElement(jnode) && !jnode.el)
    allocateSkeletons(jnode);
  const b = assembleImpl(jnode);

  const cctx = lastOf(componentContexts);
  if (!cctx)
    return b;

  // wrap insert() and dispose() to call lifecycle methods if onMount()/onCleanup() is called.
  const { onMounts, onCleanups } = cctx[0];
  let mounted = false;
  const insert = (l: BackingLocation | null | undefined): void => {
    b.insert(l);
    if (!mounted && l?.parent) {
      mounted = true;
      // Check the length each time to for onMount() called in onMount()
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

const specials: WeakMap<Component<any, any>, (props: any) => Backing> = new WeakMap();

export type MemberType<P, Key> = Key extends keyof P ? P[Key] : never;

export function createSpecial<P>(impl: (props: P) => Backing): Component<P, MemberType<P, "children">> {
  const ret: Component<P, MemberType<P, "children">> = () => 0; // Dummy. Never called but must be unique for each call.
  specials.set(ret, impl);
  return ret;
}
