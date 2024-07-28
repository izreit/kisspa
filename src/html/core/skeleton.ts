import { $noel, JSXElement, JSXNode, isJSXElement } from "./types";
import { objEntries } from "./util";

export interface Skeleton {
  el: Node | typeof $noel;
  path: (number | string)[];
}

/**
 * Collect the skeletons for the given JSXNode.
 * IMPORTANT This must be coresspondent with codeOf() and how assemble() consumes skeletons
 */
function collectSkeletonsImpl(acc: Skeleton[], target: JSXNode | { [key: string]: any }, path: (number | string)[], parent?: Node | null): void {
  if (typeof target === "string" && parent) {
    parent.appendChild(document.createTextNode(""));
    return;
  }

  if (!isJSXElement(target)) {
    if (typeof target === "object" && target) {
      for (const [k, v] of objEntries(target))
        collectSkeletonsImpl(acc, v, path.concat(k));
    }
    return;
  }

  if (target.el)
    return;
  const { name, attrs, children } = target;
  if (typeof name !== "string") {
    if (!parent)
      acc.push({ el: $noel, path });
    for (const [k, v] of objEntries(attrs))
      collectSkeletonsImpl(acc, v, path.concat(k));
    for (let i = 0; i < children.length; ++i)
      collectSkeletonsImpl(acc, children[i], path.concat(i));
    return;
  }

  const e = document.createElement(name);
  parent?.appendChild(e) ?? acc.push({ el: e, path });
  for (let i = 0; i < children.length; ++i)
    collectSkeletonsImpl(acc, children[i], path.concat(i), e);
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
      node = (typeof p === "number") ? node.children[p] : node.attrs[p];
    }
    node.el = el;
  }
}

function codeOfEntries(entries: [string, JSXNode | { [key: string]: any }][], prefix: string = "", postfix: string = ""): string {
   const ret = entries.map(([k, v]) => codeOf(v, k + ":")).join(",");
   return ret && prefix + ret + postfix;
}

function codeOfChildren(children: JSXNode[], prefix: string = "", postfix: string = "", hasParent?: boolean): string {
  const ret = children.map(c => codeOf(c, "", hasParent)).join(",");
  return ret && prefix + ret + postfix;
}

// IMPORTANT This must be coresspondent with how collectSkeletons() creates Node hierarchy.
function codeOf(target: JSXNode | { [key: string]: any }, prefix: string = "", hasParent?: boolean): string {
  if (typeof target === "string" && hasParent)
    return prefix + "T"; // "T" has no meaning. just to indicate a text node.

  if (!isJSXElement(target)) {
    return (typeof target === "object" && target) ?
      codeOfEntries(objEntries(target), prefix + "{", "}") :
      "";
  }

  if (target.el)
    return "";

  const { name, attrs, children } = target;
  if (typeof name !== "string") {
    const a = codeOfEntries(objEntries(attrs)), c = codeOfChildren(children, "|");
    // "." has no meaning. just to correspond to $noel in collectSkeletonsImpl().
    const ret = `${hasParent ? "" : "."}${(a || c) ? `(${a}${c})` : ""}`;
    return ret && prefix + ret;
  }

  return `${prefix}${name}${codeOfChildren(children, "(", ")", true)}`;
}

const skelTable: Map<object | string, Skeleton[]> = new Map();

export function allocateSkeletons(jnode: JSXNode, key?: object | null): JSXNode {
  if (isJSXElement(jnode)) {
    const code = key ?? codeOf(jnode);
    const skels = skelTable.get(code) ?? skelTable.set(code, collectSkeletons(jnode)).get(code)!;
    assignSkeletons(skels, jnode);
  }
  return jnode;
}
