import { assert, createEffect, withoutObserver } from "../../reactive/index.js";
import { allocateSkeletons } from "./skeleton.js";
import type { Backing, BackingLocation, Component, JSXNode, MountLocation, PropChildren, Refresher, ResolvedBackingLocation, SuspenseContext } from "./types.js";
import { $noel, isJSXElement } from "./types.js";
import { isArray, isFunction, isNode, isPromise, isString, isStrOrNumOrbool, lastOf, mapCoerce, objEntries, pushFuncOf } from "./util.js";

export function createLocation(parent: Node, prev?: Backing | Node | null): MountLocation;
export function createLocation(parent?: Node | null | undefined, prev?: Backing | Node | null): BackingLocation;
export function createLocation(parent?: Node | null | undefined, prev?: Backing | Node | null): MountLocation | BackingLocation {
  return { parent, prev };
}

const reOnFocusInOut = /^onfocus(in|out)$/i;

export function assignLocation(self: BackingLocation, { parent, prev }: MountLocation): void {
  self.parent = parent;
  self.prev = prev;
}

export function resolveLocation(loc: BackingLocation): ResolvedBackingLocation {
  const { parent, prev } = loc;
  return [parent, prev && (isNode(prev) ? prev : prev.tail()?.[1])];
}

let refresher: Refresher | null | undefined;
export const getRefresher = () => refresher;
export const setRefresher = (r: Refresher | null | undefined) => (refresher = r);

function insertAfter(node: Node, loc: MountLocation): void {
  const [parent, prev] = resolveLocation(loc);
  parent && parent.insertBefore(node, prev ? prev.nextSibling : parent.firstChild);
}

export interface ComponentMethods {
  onMount: (f: () => void) => void;
  onCleanup: (f: () => void) => void;
}

export interface LifecycleContext extends ComponentMethods {
  onMountFuncs_: (() => void)[];
  onCleanupFuncs_: (() => void)[];
}

export interface AssembleContext {
  lifecycleContext_: LifecycleContext | null;
  suspenseContext_: SuspenseContext;
  rootSuspenseContext_: SuspenseContext;
  disposeContext_: (f: () => void) => void;
  [key: symbol]: unknown;
}

export interface BackingCommon extends Backing {
  location_: BackingLocation;
  addDisposer_: (f: () => void) => void;
}

export function createBackingCommon(
  name: string,
  resolveChildren: () => Backing[] | null | undefined,
  l?: MountLocation | null
): BackingCommon {
  const loc: BackingLocation = l ? { ...l } : createLocation();
  const disposers: (() => void)[] = [];
  return {
    mount(l) {
      assignLocation(loc, l);
      mountBackings(resolveChildren(), l);
    },
    tail: () => tailOfBackings(resolveChildren(), loc),
    dispose() {
      callAll(disposers);
      disposeBackings(resolveChildren());
    },
    addDisposer_: pushFuncOf(disposers),
    location_: loc,
    name,
  };
}

export interface TransparentBacking extends BackingCommon {
  resetMount_: (bs: Backing[] | null | undefined) => void;
}

export function createTransparentBacking(
  name: string,
  l?: MountLocation | null,
  bs?: Backing[] | null,
): TransparentBacking {
  let backings: Backing[] | null | undefined;
  const base = createBackingCommon(name, () => backings, l) as TransparentBacking;
  base.resetMount_ = (bs) => {
    if (backings !== bs) {
      disposeBackings(backings);
      backings = bs;
      mountBackings(bs, base.location_);
    }
  };
  base.resetMount_(bs);
  return base;
}

function createNodeBackingIfNeeded(node: Node, staticParent: boolean): Backing | Node {
  return staticParent ? node : {
    mount: (loc: MountLocation) => insertAfter(node, loc),
    dispose: () => node.parentNode?.removeChild(node),
    tail: () => [node.parentNode, node] as ResolvedBackingLocation,
    name: node
  };
}

function assignAttribute(el: HTMLElement, k: string, v: string | number | boolean | null): void {
  // several non-reflecting properties cannot be changed by setAttribute()...
  (k === "value" || k === "checked" || k === "selected") ?
    ((el as any)[k] = v !== !!v ? "" + v : !!v) :
    ((v != null && v !== false) ? el.setAttribute(k, "" + v) : el.removeAttribute(k));
}

function assembleImpl(actx: AssembleContext, jnode: JSXNode, loc?: MountLocation | null): Backing;
function assembleImpl(actx: AssembleContext, jnode: JSXNode, loc?: MountLocation | null, node?: Node | null): Backing | Node;
function assembleImpl(actx: AssembleContext, jnode: JSXNode, loc?: MountLocation | null, node?: Node | null): Backing | Node {
  if (isPromise(jnode)) {
    let disposed: boolean | undefined;
    const b = createTransparentBacking("Delay", loc);
    b.addDisposer_(() => { disposed = true; });
    const p = jnode.then((j) => {
      disposed || b.resetMount_([assemble(actx, j)]);
    });
    actx.suspenseContext_.add_(p);
    return b;
  }

  if (isFunction(jnode)) {
    const b = createTransparentBacking("Fun", loc);
    b.addDisposer_(createEffect(() => {
      b.resetMount_([assemble(actx, jnode())]);
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
    let refVal: ((v: unknown) => void) | ((v: unknown) => void)[] | null | undefined;
    const addDisposer = actx.disposeContext_;

    for (const [k, v] of objEntries(attrs)) {
      if (k === "ref" && v) {
        refVal = v;
      } else if (k[0] === "o" && k[1] === "n") {
        const lk = k.toLowerCase();
        const [fun, opts] = isArray(v) ? v : [v];
        el!.addEventListener((lk in el! || reOnFocusInOut.test(lk) ? lk : k).slice(2), fun, opts);

      } else if (isStrOrNumOrbool(v)) {
        assignAttribute(el as HTMLElement, k, v);
      } else if (isFunction(v)) {
        addDisposer(createEffect(() => { assignAttribute(el as HTMLElement, k, v()); }));
      } else if (typeof v === "object" && v) {
        for (const [vk, vv] of objEntries(v)) {
          if (isStrOrNumOrbool(vv)) {
            (el as any)[k][vk] = vv;
          } else if (isFunction(vv)) {
            addDisposer(createEffect(() => { (el as any)[k][vk] = vv(); }));
          }
        }
      }
    }

    let skelCh: Node | null | undefined = el!.firstChild;
    const chLoc: MountLocation = createLocation(el!);
    for (const v of children) {
      // IMPORTANT This condition, for consuming or skip the skeleton, must be correspondent with collectSkeletons().
      const ch = (isJSXElement(v) && !v.el && isString(v.name)) ?
        assembleImpl(actx, v, null, skelCh) :
        assembleImpl(actx, v, chLoc);
      skelCh = skelCh && skelCh.nextSibling;
      chLoc.prev = ch;
      if (!isNode(ch))
        addDisposer(ch.dispose);
    }

    mapCoerce(refVal, r => {
      r(el);
      addDisposer(() => r(null));
    });

    return createNodeBackingIfNeeded(el!, staticParent);
  }

  const special = (name as SpecialComponent<unknown> | FragmentComponent).special;
  if (special === "") // Fragment. (cf. fragment.ts)
    return createTransparentBacking("Frag", loc, children.map(c => assemble(actx, c)));

  const args = { ...attrs, children: rawChildren };
  const assembler = (c: Component<any>) => {
    let b: Backing;
    actx = { ...actx, lifecycleContext_: null };
    try {
      assembleContextStack.push(actx);
      b = special ?
        special(actx, args) :
        assembleImpl(actx, allocateSkeletons(c(args), c, children.length));
    } finally {
      assembleContextStack.pop();
    }

    if (!actx.lifecycleContext_)
      return b;

    // wrap mount() and dispose() to call lifecycle methods if onMount()/onCleanup() is called.
    const { onMountFuncs_, onCleanupFuncs_ } = actx.lifecycleContext_;
    const INITIAL = 0;
    const MOUNTED = 1;
    const DISPOSED = 2;
    let mountState: typeof INITIAL | typeof MOUNTED | typeof DISPOSED = INITIAL;
    return {
      ...b,
      mount: (l: MountLocation): void => {
        b.mount(l);
        actx.suspenseContext_.current_().then(() => {
          if (mountState === INITIAL) {
            mountState = MOUNTED;
            // Check the length each time for onMount() called inside onMount()
            for (let i = 0; i < onMountFuncs_.length; ++i)
              onMountFuncs_[i]();
          }
        });
      },
      dispose: (): void => {
        b.dispose();
        if (mountState === MOUNTED) {
          // Revserse order for notify detach from decendants to ancestors.
          for (let i = onCleanupFuncs_.length - 1; i >= 0; --i)
            onCleanupFuncs_[i]();
        }
        mountState = DISPOSED;
      },
    };
  };

  const comp = refresher ? refresher.resolve(name) : name;
  const assembled = assembler(comp);
  const b = refresher ? refresher.track(comp, assembled, assembler) : assembled;
  if (loc)
    b.mount(loc);
  return b;
}

const assembleContextStack: AssembleContext[] = [];

export function useAssembleContext(): AssembleContext {
  const actx = lastOf(assembleContextStack);
  assert(actx, "Not in (synchrnous part of) component");
  return actx;
}

export function useComponentMethods(): ComponentMethods {
  const actx = useAssembleContext();
  if (!actx.lifecycleContext_) {
    const onMountFuncs_: (() => void)[] = [];
    const onCleanupFuncs_: (() => void)[] = [];
    actx.lifecycleContext_ = {
      onMountFuncs_,
      onCleanupFuncs_,
      onMount: pushFuncOf(onMountFuncs_),
      onCleanup: pushFuncOf(onCleanupFuncs_),
    } as LifecycleContext;
  }
  return actx.lifecycleContext_;
}

export function onMount(f: () => void): void {
  useComponentMethods().onMount(f);
}

export function onCleanup(f: () => void): void {
  useComponentMethods().onCleanup(f);
}

export function assemble(actx: AssembleContext, jnode: JSXNode): Backing {
  return withoutObserver(() => {
    if (isJSXElement(jnode) && !jnode.el)
      allocateSkeletons(jnode);

    const disposers: (() => void)[] = [];
    const childActx = { ...actx, disposeContext_: pushFuncOf(disposers) };
    const b = assembleImpl(childActx, jnode);
    return disposers.length ?
      { ...b, dispose: () => (callAll(disposers), b.dispose()) } :
      b;
  });
}

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

export function tailOfBackings(bs: Backing[] | null | undefined, prev: BackingLocation): ResolvedBackingLocation {
  if (bs) {
    for (let i = bs.length - 1; i >= 0; --i) {
      const t = bs[i].tail();
      if (t)
        return t;
    }
  }
  return resolveLocation(prev);
}

export function mountBackings(bs: Backing[] | null | undefined, loc: BackingLocation): void {
  const parent = loc.parent;
  parent && bs && bs.reduce((prev, b) => (b.mount({ parent, prev }), b), loc.prev);
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
