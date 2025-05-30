import { autorun, withoutObserver } from "../../reactive/index.js";
import { allocateSkeletons } from "./skeleton.js";
import type { Backing, BackingLocation, Component, JSXNode, PropChildren, Ref, Refresher, ResolvedBackingLocation, } from "./types.js";
import { $noel, isJSXElement } from "./types.js";
import { arrayify, doNothing, isArray, isFunction, isNode, isPromise, isString, objEntries } from "./util.js";

export function createLocation(parent?: Node | null, prev?: Backing | Node | null): BackingLocation {
  return { parent, prev };
}

const reOnFocusInOut = /^onfocus(in|out)$/i;
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

export function resolveLocation(loc: BackingLocation | null | undefined): ResolvedBackingLocation {
  const { parent, prev } = loc ?? nullLocation;
  return [parent, prev && (isNode(prev) ? prev : prev.tail()?.[1])];
}

let refresher: Refresher | null | undefined;
export const getRefresher = () => refresher;
export const setRefresher = (r: Refresher | null | undefined) => (refresher = r);

function insertAfter(node: Node, loc: BackingLocation): void {
  const [parent, prev] = resolveLocation(loc);
  parent?.insertBefore(node, prev ? prev.nextSibling : parent.firstChild);
}

export interface AssembleContext {
  suspenseContext_: Promise<void>[] | {
    push: (p: Promise<void>) => void,
    then: (onfulfilled: () => void, onrejected?: (e: unknown) => void) => void;
  };
  [key: symbol]: unknown;
  // TODO? Not yet considered but may be efficent to gather disposers
  // disposeContext_: (() => void)[];
}

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
    tail: () => tailOfBackings(resolveChildren(), loc),
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

export function createSimpleBacking(
  name: string,
  l?: BackingLocation | null,
  bs?: Backing[] | null,
): SimpleBacking {
  let backings: Backing[] | null | undefined;
  const base = createBackingCommon(name, () => backings, l) as SimpleBacking;
  base.setBackings_ = (bs) => {
    if (backings !== bs) {
      disposeBackings(backings);
      backings = bs;
      insertBackings(bs, base.location_);
    }
  };
  base.setBackings_(bs);
  return base;
}

function createNodeBackingIfNeeded(node: Node, staticParent: boolean, disposers?: (() => void)[]): Backing | Node {
  const tail = () => [node.parentNode, node] as ResolvedBackingLocation;

  if (staticParent) {
    if (!disposers || !disposers.length)
      return node;
    const dispose = (disposers.length === 1) ? disposers[0] : () => callAll(disposers);
    return { insert: doNothing, dispose, tail, name: node };
  }

  const insert = (loc?: BackingLocation | null | undefined) => {
    if (loc && loc.parent) {
      insertAfter(node, loc);
    } else {
      node.parentNode?.removeChild(node);
    }
  };
  const dispose = () => {
    insert();
    disposers && callAll(disposers);
  };
  return { insert, dispose, tail, name: node };
}

function resolveRef(el: HTMLElement, r: Ref<HTMLElement> | ((e: HTMLElement) => void)): void {
  isFunction(r) ? r(el) : (r.value = el);
}

function assignAttribute(el: HTMLElement, k: string, v: string | number | boolean | null): void {
  // several non-reflecting properties cannot be changed by setAttribute()...
  (k === "value" || k === "checked" || k === "selected") ?
    ((el as any)[k] = v !== !!v ? "" + v : !!v) :
    ((v != null && v !== false) ? el.setAttribute(k, "" + v) : el.removeAttribute(k));
}

function assembleImpl(actx: AssembleContext, jnode: JSXNode, loc?: BackingLocation | null): Backing;
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

  if (el && !el.parentNode && loc)
    insertAfter(el, loc);

  if (!(jnode && typeof jnode === "object")) {
    el!.nodeValue = (jnode ?? "") + "";
    return createNodeBackingIfNeeded(el!, staticParent);
  }

  const { name, attrs, chs: children, rchs: rawChildren } = jnode;
  if (isString(name)) {
    let refVal: (Ref<HTMLElement> | ((v: HTMLElement) => void))[] | null | undefined;
    const disposers: (() => void)[] = [];

    for (const [k, v] of objEntries(attrs)) {
      if (k === "ref" && v) {
        refVal = arrayify(v);
        continue;
      }
      if (k[0] === "o" && k[1] === "n") {
        const lk = k.toLowerCase();
        const [fun, opts] = isArray(v) ? v : [v];
        el!.addEventListener((lk in el! || reOnFocusInOut.test(lk) ? lk : k).slice(2), fun, opts);

      } else if (isStrOrNumOrbool(v)) {
        assignAttribute(el as HTMLElement, k, v);
      } else if (isFunction(v)) {
        disposers.push(autorun(() => { assignAttribute(el as HTMLElement, k, v()); }));
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
    const chLoc: BackingLocation = createLocation(el!);
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

  const special = (name as SpecialComponent<unknown> | FragmentComponent).special;
  if (special === "") // Fragment. (cf. fragment.ts)
    return createSimpleBacking("Frag", loc, children.map(c => assemble(actx, c)));

  const args = { ...attrs, children: rawChildren };
  if (special) {
    const b = special(actx, args);
    b.insert(loc);
    return b;
  }

  const assembler = (c: Component<any>) => assembleImpl(actx, allocateSkeletons(c(args), c, children.length), loc);
  const comp = refresher?.resolve(name) ?? name;
  const b = assembler(comp);
  return refresher?.track(comp, b, assembler) ?? b;
  // return assembleImpl(actx, allocateSkeletons(comp(args), comp, children.length), loc);
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
    let mounted = false;
    const { onMounts, onCleanups } = cctx[0];
    const sctx = actx.suspenseContext_;
    const insert = (l: BackingLocation | null | undefined): void => {
      b.insert(l);
      if (!mounted && l && l.parent) {
        mounted = true;
        (Array.isArray(sctx) ? Promise.all(sctx) : sctx).then(() => {
          // Check the length each time for onMount() called inside onMount()
          for (let i = 0; i < onMounts.length; ++i)
            onMounts[i]();
        });
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

// export type MemberType<P, Key> = Key extends keyof P ? P[Key] : never;

export interface SpecialComponent<P> extends Component<P> {
  special: (actx: AssembleContext, props: P) => Backing;
}

export interface FragmentComponent extends Component<{ children?: PropChildren }> {
  special: ""; // "" is marker for Fragment. See assembleImpl().
}

// Ugh! I don't know why but making the return value SpecialComponent<P> breaks type inference
// around generics (e.g. Match.Props<P>, For.Props<P>). Down cast if you need a SpecialComponent.
export function createSpecial<P>(impl: (actx: AssembleContext, props: P) => Backing): Component<P> {
  const ret = (() => 0) as unknown as SpecialComponent<P>; // Dummy. Never called but must be unique for each call.
  ret.special = impl;
  return ret;
}

export function tailOfBackings(bs: Backing[] | null | undefined, prev?: BackingLocation): ResolvedBackingLocation {
  if (bs) {
    for (let i = bs.length - 1; i >= 0; --i) {
      const t = bs[i].tail();
      if (t)
        return t;
    }
  }
  return resolveLocation(prev);
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
