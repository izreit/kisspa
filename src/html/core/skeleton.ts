import { $noel, JSXElement, JSXNode, isJSXElement } from "./types";
import { objEntries } from "./util";

export interface Skeleton {
  el: Node | typeof $noel;
  path: (number | string)[];
}

/**
 * Collect the skeletons for the given JSXNode.
 * IMPORTANT This must be coresspondent with how assemble() consumes skeletons.
 */
function collectSkeletonsImpl(acc: Skeleton[], target: JSXNode | { [key: string]: any }, path: (number | string)[], parent: Node | null = null): void {
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

// For development build. NOT YET used.
//
// function matchAttrs(lhs: Attributes, rhs: Attributes): boolean {
//   const lt = typeof lhs;
//   if (lt !== typeof rhs) return false;
//   if (lhs === rhs || lt === "function") return true;
//   if (lt !== "object" || !lhs) return false;
//   const le = objEntries(lhs), re = objEntries(rhs);
//   return (le.length === re.length && le.every((e, i) => matchAttrs(e, re[i])));
// }
//
// function matchElement(lhs: JSXElement, rhs: JSXElement): boolean {
//   const lc = lhs.children, rc = rhs.children;
//   return (
//     lhs.name === rhs.name &&
//     matchAttrs(lhs.attrs, rhs.attrs) &&
//     lc.length === rc.length &&
//     lc.every((c, i) => matchNode(c, rc[i]))
//   );
// }
//
// function matchNode(lhs: JSXNode, rhs: JSXNode): boolean {
//   return (typeof lhs === typeof rhs) && (
//     isJSXElement(lhs) && isJSXElement(rhs) && matchElement(lhs, rhs) ||
//     isStrOrNum(lhs) ||
//     typeof lhs === "function" ||
//     isPromise(lhs) && isPromise(rhs) ||
//     (lhs == null && rhs == null)
//   );
// }

const skelTable: WeakMap<object, Skeleton[]> = new WeakMap();

export function allocateSkeletons(jnode: JSXNode, key?: object | null): JSXNode {
  if (isJSXElement(jnode)) {
    const skels = key
      ? (skelTable.get(key) ?? skelTable.set(key, collectSkeletons(jnode)).get(key)!)
      : collectSkeletons(jnode);
    assignSkeletons(skels, jnode);
  }
  return jnode;
}
