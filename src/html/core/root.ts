import { JSXNode } from "./types";
import { Backing, assemble, createLocation } from "./backing";

export interface BackingRoot {
  attach(jnode: JSXNode): void;
  detach(): void;
}

export type RootLocation = Element | { after: Node };

export function createRoot(location: Element | { after: Node }): BackingRoot {
  let b: Backing | null | undefined;
  const attach = (jnode: JSXNode) => {
    b && b.dispose();
    b = assemble({ suspenseContext_: null }, jnode);
    const after = (location as { after: Node }).after;
    const loc = after ?
      createLocation(after.parentElement, after) :
      createLocation(location as Element, null);
    b.insert(loc);
  };
  const detach = () => {
    b && b.dispose();
    b = null;
  };
  return { attach, detach };
}

export function attach(location: Element | { after: Node }, jnode: JSXNode): () => void {
  const r = createRoot(location);
  r.attach(jnode);
  return r.detach;
}
