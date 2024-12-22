import { autorun, withoutObserver } from "../../reactive";
import { allocateSkeletons } from "./skeleton";
import { $noel, type Component, type JSXNode, type Ref, isJSXElement } from "./types";
import { arrayify, isFunction, isNode, isPromise, isString, objEntries } from "./util";

export interface Backing {
  insert(loc?: BackingLocation | null | undefined): void;
  tail(): Node | null | undefined;
  dispose(): void;
  name: Node | string;
}

export interface BackingLocation {
  parent: Node | null | undefined;
  prev: Backing | Node | null | undefined;
}

export function createLocation(parent?: Node | null, prev?: Backing | Node | null): BackingLocation {
  return { parent, prev };
}

const nullLocation = createLocation();

export function assignLocation(self: BackingLocation, loc: BackingLocation | null | undefined): boolean {
  const { parent, prev } = loc ?? nullLocation;
  const differ = self.parent !== parent || self.prev !== prev;
  if (differ) {
    self.parent = parent;
    self.prev = prev;
  }
  return differ;
}

function isStrOrNumOrbool(v: any): v is number | string | boolean {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

export function tailOf(p: Backing | Node | null | undefined): Node | null | undefined {
  return p && (isNode(p) ? p : p.tail());
}

function insertAfter(node: Node, parent: Node, prev: Backing | Node | null | undefined): void {
  const rawPrev = tailOf(prev);
  const after = rawPrev ? rawPrev.nextSibling : parent.firstChild;
  parent.insertBefore(node, after);
}

export interface AssembleContext {
  suspenseContext_: Promise<void>[] | { push: (p: Promise<void>) => void };
  // TODO? Not yet considered but may be efficent to gather disposers
  // disposeContext_: (() => void)[];
}

const doNothing = () => {};

export interface BackingCommon extends Backing {
  location_: BackingLocation;
  addDisposer_: (f: () => void) => void;
}

export function createBackingCommon(
  name: string,
  resolveChildren: () => Backing[] | null | undefined,
  l?: BackingLocation | null
): BackingCommon {
  const loc = l ? { ...l } : createLocation();
  const disposers: (() => void)[] = [];
  return {
    insert(l) {
      if (assignLocation(loc, l))
        insertBackings(resolveChildren(), l);
    },
    tail: () => tailOfBackings(resolveChildren(), loc.prev),
    dispose() {
      callAll(disposers);
      disposeBackings(resolveChildren());
    },
    addDisposer_: f => disposers.push(f),
    location_: loc,
    name,
  };
}

export interface SimpleBacking extends BackingCommon {
  setBackings_: (bs: Backing[] | null | undefined) => void;
}

export function createSimpleBacking(name: string, l?: BackingLocation | null): SimpleBacking {
  let backings: Backing[] | null | undefined;
  const base = createBackingCommon(name, () => backings, l) as SimpleBacking;
  base.setBackings_ = (bs) => {
    if (backings !== bs) {
      disposeBackings(backings);
      backings = bs;
      insertBackings(bs, base.location_);
    }
  };
  return base;
}

function createNodeBackingIfNeeded(node: Node, staticParent: boolean, disposers?: (() => void)[]): Backing | Node {
  if (staticParent) {
    if (!disposers || !disposers.length)
      return node;
    const dispose = (disposers.length === 1) ? disposers[0] : () => callAll(disposers);
    return { insert: doNothing, dispose, tail: () => node, name: node };
  }

  const insert = (pos?: BackingLocation | null | undefined) => {
    if (pos && pos.parent) {
      insertAfter(node, pos.parent, pos.prev);
    } else {
      node.parentNode?.removeChild(node);
    }
  };
  const dispose = () => {
    insert();
    disposers && callAll(disposers);
  };
  return { insert, dispose, tail: () => node, name: node };
}

function resolveRef(el: HTMLElement, r: Ref<HTMLElement> | ((e: HTMLElement) => void)): void {
  isFunction(r) ? r(el) : (r.value = el);
}

function assignAttribute(el: HTMLElement, k: string, v: string | number | boolean | null): void {
  (v != null) ? el.setAttribute(k, "" + v) : el.removeAttribute(k);
}

function assembleImpl(actx: AssembleContext, jnode: JSXNode): Backing;
function assembleImpl(actx: AssembleContext, jnode: JSXNode, loc?: BackingLocation | null, node?: Node | null): Backing | Node;
function assembleImpl(actx: AssembleContext, jnode: JSXNode, loc?: BackingLocation | null, node?: Node | null): Backing | Node {
  if (isPromise(jnode)) {
    let disposed: boolean | undefined;
    const b = createSimpleBacking("Delay", loc);
    b.addDisposer_(() => { disposed = true; });
    const p = jnode.then((j) => {
      disposed || b.setBackings_([assemble(actx, j)]);
    });
    actx.suspenseContext_.push(p);
    return b;
  }

  if (isFunction(jnode)) {
    const b = createSimpleBacking("Fun", loc);
    b.addDisposer_(autorun(() => {
      b.setBackings_([assemble(actx, jnode())]);
    }));
    return b;
  }

  const staticParent = !!(node && node.parentNode);
  const el =
    node ??
    ((jnode && typeof jnode === "object") ?
      (jnode.el && jnode.el !== $noel ? jnode.el.cloneNode(true) : null) :
      document.createTextNode(""));

  if (el && !el.parentNode && loc && loc.parent)
    insertAfter(el, loc.parent, loc.prev);

  if (!(jnode && typeof jnode === "object")) {
    el!.nodeValue = (jnode ?? "") + "";
    return createNodeBackingIfNeeded(el!, staticParent);
  }

  const { name, attrs, children, rawChildren } = jnode;
  if (isString(name)) {
    let refVal: (Ref<HTMLElement> | ((v: HTMLElement) => void))[] | null | undefined;
    const disposers: (() => void)[] = [];

    for (const [k, v] of objEntries(attrs)) {
      if (k === "ref" && v) {
        refVal = arrayify(v);
        continue;
      }
      if (isStrOrNumOrbool(v)) {
        assignAttribute(el as HTMLElement, k, v);
      } else if (isFunction(v)) {
        if (k[0] === "o" && k[1] === "n") {
          (el as any)[k.toLowerCase()] = v;
        } else {
          disposers.push(autorun(() => { assignAttribute(el as HTMLElement, k, v()); }));
        }
      } else if (typeof v === "object" && v) {
        for (const [vk, vv] of objEntries(v)) {
          if (isStrOrNumOrbool(vv)) {
            (el as any)[k][vk] = vv;
          } else if (isFunction(vv)) {
            disposers.push(autorun(() => { (el as any)[k][vk] = vv(); }));
          }
        }
      }
    }

    let skelCh: Node | null | undefined = el!.firstChild;
    const chLoc = createLocation(el!);
    for (const v of children) {
      let ch: Backing | Node;
      // IMPORTANT This condition, for consuming the skeleton, must be correspondent with collectSkeletons().
      if (isString(v) || (isJSXElement(v) && !v.el && isString(v.name))) {
        ch = assembleImpl(actx, v, null, skelCh);
        skelCh = skelCh && skelCh.nextSibling;
      } else {
        ch = assembleImpl(actx, v, chLoc);
      }
      chLoc.prev = ch;
      if (!isNode(ch))
        disposers.push(ch.dispose);
    }

    if (refVal) {
      for (const r of refVal)
        resolveRef(el as HTMLElement, r);
    }

    return createNodeBackingIfNeeded(el!, staticParent, disposers);
  }

  const special = specials.get(name);
  if (special) {
    const b = special(actx, { ...attrs, children: rawChildren });
    b.insert(loc);
    return b;
  }

  const expanded = name({ ...attrs, children: rawChildren });
  // TODO check isPromise(expanded) to force delayAssemble() to cache the skeletons
  return assembleImpl(actx, allocateSkeletons(expanded, name), loc);
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

export function assemble(actx: AssembleContext, jnode: JSXNode): Backing {
  return withoutObserver(() => {
    if (isJSXElement(jnode) && !jnode.el)
      allocateSkeletons(jnode);

    let b: Backing;
    let cctx: typeof componentContexts[number];
    componentContexts.push(null);
    try {
      b = assembleImpl(actx, jnode);
    } finally {
      cctx = componentContexts.pop()!;
    }
    if (!cctx)
      return b;

    // wrap insert() and dispose() to call lifecycle methods if onMount()/onCleanup() is called.
    const { onMounts, onCleanups } = cctx[0];
    let mounted = false;
    const insert = (l: BackingLocation | null | undefined): void => {
      b.insert(l);
      if (!mounted && l && l.parent) {
        mounted = true;
        // Check the length each time for onMount() called inside onMount()
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
  });
}

const specials: WeakMap<Component<any>, (actx: AssembleContext, props: any) => Backing> = new WeakMap();

export type MemberType<P, Key> = Key extends keyof P ? P[Key] : never;

export function createSpecial<P>(impl: (actx: AssembleContext, props: P) => Backing): Component<P> {
  const ret: Component<P> = () => 0; // Dummy. Never called but must be unique for each call.
  specials.set(ret, impl);
  return ret;
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

export function insertBackings(bs: Backing[] | null | undefined, loc: BackingLocation | null | undefined): void {
  if (bs) {
    if (loc && loc.parent) {
      const parent = loc.parent;
      bs.reduce((prev, b) => (b.insert({ parent, prev }), b), loc.prev);
    } else {
      for (const b of bs)
        b.insert();
    }
  }
}

export function disposeBackings(bs: Backing[] | null | undefined): void {
  if (bs) {
    for (const b of bs)
      b.dispose();
  }
}

export function callAll(fs: (() => unknown)[]): void {
  for (const f of fs)
    f();
}
