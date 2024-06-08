import { autorun } from "../../reactive";
import { allocateSkeletons } from "./skeleton";
import { $h, Component, JSXElement, JSXNode } from "./types";

export interface Backing {
  insert(loc: BackingLocation | null | undefined): void;
  tail(): Node | null;
  name: Node | string;
}

export interface BackingLocation {
  parent: Node | null;
  prev: Backing | null;
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

function insertAfter(node: Node, parent: Node, prev: Backing | null): void {
  const rawPrev = prev?.tail();
  const after = rawPrev ? rawPrev.nextSibling : parent.firstChild;
  parent.insertBefore(node, after);
}

function createElementBacking(node: Node): Backing {
  return {
    insert: (pos) => {
      if (pos?.parent) {
        insertAfter(node, pos.parent, pos.prev);
      } else {
        node.parentNode?.removeChild(node);
      }
    },
    tail: () => node!,
    name: node
  };
}

export function assemble(jnode: JSXNode, node?: Node | null, loc?: BackingLocation | null): Backing {
  const el =
    node ??
    ((jnode && typeof jnode === "object")
      ? jnode.el?.cloneNode(true)
      : document.createTextNode((typeof jnode === "function") ? "" : (jnode + "")));

  if (el && !el.parentNode && loc?.parent)
    insertAfter(el, loc.parent, loc.prev);

  if (typeof jnode !== "object" || jnode == null) {
    if (typeof jnode === "function") {
      autorun(() => { el!.nodeValue = jnode() + ""; });
    } else if (jnode != null) {
      el!.nodeValue = jnode + "";
    }
    return createElementBacking(el!);
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
    let chLoc: BackingLocation = { parent: el!, prev: null };
    for (const v of children) {
      // IMPORTANT This condition, for consuming the skeleton, must be correspondent with collectSkeletons().
      if (typeof v === "string" || (isJSXElement(v) && !v.el && typeof v.name === "string")) {
        chLoc.prev = assemble(v, ch);
        ch = ch?.nextSibling ?? null;
      } else {
        chLoc.prev = assemble(v, null, chLoc);
      }
    }
    return createElementBacking(el!);

  } else {
    const special = specials.get(name);
    if (special) {
      const b = special({ ...attrs, children });
      b.insert(loc);
      return b;
    }

    const expanded = name({ ...attrs, children });
    return assemble(allocateSkeletons(expanded, name), null, loc);
  }
}

export function attach(parent: Element, jnode: JSXNode): void {
  assemble(allocateSkeletons(jnode), null, { parent, prev: null });
}

export function tailOfBackings(bs: Backing[] | null | undefined, prev?: Backing | null): Node | null {
  if (bs) {
    for (let i = bs.length - 1; i >= 0; --i) {
      const t = bs[i].tail();
      if (t)
        return t;
    }
  }
  return prev?.tail() ?? null;
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

const specials: WeakMap<Component<any, any>, (props: any) => Backing> = new WeakMap();

export type MemberType<P, Key> = Key extends keyof P ? P[Key] : never;

export function createSpecial<P>(impl: (props: P) => Backing): Component<P, MemberType<P, "children">> {
  const ret: Component<P, MemberType<P, "children">> = () => ""; // Dummy. Never called.
  specials.set(ret, impl);
  return ret;
}
