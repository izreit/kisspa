import { $noel, JSXElement, JSXNode, isJSXElement } from "./types";

function isStrOrNum(v: any): v is number | string {
  return typeof v === "string" || typeof v === "number";
}

export interface Skeleton {
  el: Node | typeof $noel;
  path: (number | string)[];
}

/**
 * Collect the skeletons for the given JSXNode.
 * IMPORTANT This must be coresspondent with how assemble() consumes skeletons.
 */
function collectSkeletonsImpl(acc: Skeleton[], jnode: JSXNode, parent: Node | null, path: (number | string)[]): void {
  if (typeof jnode === "string" && parent) {
    parent.appendChild(document.createTextNode(""));
    return;
  }

  if (!isJSXElement(jnode) || jnode.el)
    return;
  const { name, attrs, children } = jnode;
  if (typeof name !== "string") {
    if (!parent)
      acc.push({ el: $noel, path });
    for (const [k, v] of Object.entries(attrs))
      collectSkeletonsImpl(acc, v, null, path.concat(k));
    for (let i = 0; i < children.length; ++i)
      collectSkeletonsImpl(acc, children[i], null, path.concat(i));
    return;
  }

  const e = document.createElement(name);
  parent?.appendChild(e) ?? acc.push({ el: e, path });
  for (const [k, v] of Object.entries(attrs)) {
    if (isStrOrNum(v)) {
      (e as any)[k] = v;
    } else if (typeof v === "object" && v) {
      for (const [vk, vv] of Object.entries(v)) {
        if (isStrOrNum(vv))
          (e as any)[k][vk] = vv;
      }
    }
  }
  for (let i = 0; i < children.length; ++i)
    collectSkeletonsImpl(acc, children[i], e, path.concat(i));
}

function collectSkeletons(jnode: JSXNode): Skeleton[] {
  const ret: Skeleton[] = [];
  collectSkeletonsImpl(ret, jnode, null, []);
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

const skelTable: WeakMap<object, Skeleton[]> = new WeakMap();

export function allocateSkeletons(jnode: JSXNode, key?: object | null): JSXNode {
  const skels = key
    ? (skelTable.get(key) ?? skelTable.set(key, collectSkeletons(jnode)).get(key)!)
    : collectSkeletons(jnode);
  assignSkeletons(skels, jnode);
  return jnode;
}
