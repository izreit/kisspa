import { autorun } from "../../reactive";
import { allocateSkeletons } from "./skeleton";
import { $h, Component, JSXElement, JSXNode } from "./types";

export interface Backing {
  insert(loc: BackingLocation | null | undefined): void;
  tail(): Node | null;
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

export function isJSXElement(v: any): v is JSXElement {
  return v?.[$h];
}

export function isStrOrNum(v: any): v is number | string {
  return typeof v === "string" || typeof v === "number";
}

export function tailOf(p: Backing | Node | null | undefined): Node | null {
  return p ? ("nodeName" in p ? p : p.tail()) : null;
}

function insertAfter(node: Node, parent: Node, prev: Backing | Node | null): void {
  const rawPrev = tailOf(prev);
  const after = rawPrev ? rawPrev.nextSibling : parent.firstChild;
  parent.insertBefore(node, after);
}

function createElementBacking(node: Node, disposers: (() => void)[]): Backing {
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

export function assembleImpl(jnode: JSXNode): Backing;
export function assembleImpl(jnode: JSXNode, loc?: BackingLocation | null, node?: Node | null): Backing | Node;
export function assembleImpl(jnode: JSXNode, loc?: BackingLocation | null, node?: Node | null): Backing | Node {
  const el =
    node ??
    ((jnode && typeof jnode === "object")
      ? jnode.el?.cloneNode(true)
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
    return createElementBacking(el!, disposers);
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
    return (node?.parentNode && disposers.length === 0) ? el! : createElementBacking(el!, disposers);

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

export function attach(parent: Element, jnode: JSXNode): void {
  const b = assemble(allocateSkeletons(jnode));
  b.insert({ parent, prev: null });
}

export function tailOfBackings(bs: Backing[] | null | undefined, prev?: Backing | Node | null): Node | null {
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
