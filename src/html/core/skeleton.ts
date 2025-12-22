import { $noel, isJSXElement, type JSXElement, type JSXNode } from "./types.js";
import { isString, objEntries } from "./util.js";

export interface Skeleton {
  el: Node | typeof $noel;
  path: (number | string)[];
}

/**
 * Collect the skeletons for the given JSXNode.
 * IMPORTANT This must be coresspondent with codeOf() and how assemble() consumes skeletons
 */
function collectSkeletonsImpl(acc: Skeleton[], target: JSXNode | { [key: string]: any }, path: (number | string)[], parent?: HTMLElement | null): void {
  if (!isJSXElement(target)) {
    if (typeof target === "object" && target) {
      // No need to append "" to parent, since this should be only in props, not a JSX tree structure itself.
      for (const [k, v] of objEntries(target))
        collectSkeletonsImpl(acc, v, path.concat(k));
    } else {
      parent && parent.append("");
    }
    return;
  }

  if (target.el) {
    parent && parent.append("");
    return;
  }

  const { name, attrs, chs: children } = target;
  if (!isString(name)) {
    parent ? parent.append("") : acc.push({ el: $noel, path });
    for (const [k, v] of objEntries(attrs))
      collectSkeletonsImpl(acc, v, path.concat(k));
    for (let i = 0; i < children.length; ++i)
      collectSkeletonsImpl(acc, children[i], path.concat(i));
  } else {
    const e = document.createElement(name);
    parent ? parent.append(e) : acc.push({ el: e, path });
    for (let i = 0; i < children.length; ++i)
      collectSkeletonsImpl(acc, children[i], path.concat(i), e);
  }
}

function collectSkeletons(jnode: JSXNode): Skeleton[] {
  const ret: Skeleton[] = [];
  collectSkeletonsImpl(ret, jnode, []);
  return ret;
}

function assignSkeletons(skels: Skeleton[], jnode: JSXNode): void {
  for (let i = 0; i < skels.length; ++i) {
    const { el, path } = skels[i];
    let node = jnode as JSXElement;
    for (let j = 0; j < path.length; ++j) {
      const p = path[j];
      node = (typeof p === "number") ? node.chs[p] : node.attrs[p];
    }
    node.el = el;
  }
}

function codeOfEntries(entries: [string, JSXNode | { [key: string]: any }][], prefix = "", postfix = ""): string {
   const ret = entries.map(([k, v]) => codeOf(v, k + ":")).join(",");
   return ret && prefix + ret + postfix;
}

function codeOfChildren(children: JSXNode[], prefix: string, postfix = "", hasParent?: boolean): string {
  const ret = children.map(c => codeOf(c, "", hasParent)).join(",");
  return ret && prefix + ret + postfix;
}

// IMPORTANT This must be coresspondent with how collectSkeletons() creates Node hierarchy.
function codeOf(target: JSXNode | { [key: string]: any }, prefix = "", hasParent?: boolean): string {
  if (!isJSXElement(target)) {
    return (typeof target === "object" && target) ?
      codeOfEntries(objEntries(target), prefix + "{", "}") :
      hasParent ? prefix + "T" : ""; // "T" has no meaning. just to indicate a text node.
  }

  if (target.el)
    return hasParent ? "_" : ""; // "_" has no meaning. just to indicate a dummy text node.

  const { name, attrs, chs: children } = target;
  if (!isString(name)) {
    const a = codeOfEntries(objEntries(attrs));
    const c = codeOfChildren(children, "|");
    // "_" and "." have no meaning. just to correspond to dummy text node or $noel in collectSkeletonsImpl().
    return `${prefix}${hasParent ? "_" : "."}${a || c ? `(${a}${c})` : ""}`;
  }

  return `${prefix}${name}${codeOfChildren(children, "(", ")", true)}`;
}

const keyTable: WeakMap<object, object[]> = new WeakMap();
const skelTable: Map<object | string, Skeleton[]> = new Map();

export function allocateSkeletons(jnode: JSXNode): JSXNode;
export function allocateSkeletons(jnode: JSXNode, keyBase: object, childrenCount: number): JSXNode;
export function allocateSkeletons(jnode: JSXNode, keyBase?: object, childrenCount?: number): JSXNode {
  if (isJSXElement(jnode)) {
    const key = keyBase ? (((keyTable.get(keyBase) ?? keyTable.set(keyBase, []).get(keyBase)!)[childrenCount!]) ??= {}) : codeOf(jnode);
    const skels = skelTable.get(key) ?? skelTable.set(key, collectSkeletons(jnode)).get(key)!;
    assignSkeletons(skels, jnode);
  }
  return jnode;
}
