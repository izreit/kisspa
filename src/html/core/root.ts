import { JSXNode } from "./types";
import { Backing, assemble, createLocation } from "./backing";

export interface BackingRoot {
  attach(jnode: JSXNode): void;
  detach(): void;
}

export function createRoot(parent: Element): BackingRoot {
  let b: Backing | null | undefined;
  const attach = (jnode: JSXNode) => {
    b?.dispose();
    b = assemble({ suspenseContext_: null }, jnode);
    b.insert(createLocation(parent));
  };
  const detach = () => {
    b?.dispose();
    b = null;
  };
  return { attach, detach };
}

export function attach(parent: Element, jnode: JSXNode): () => void {
  const r = createRoot(parent);
  r.attach(jnode);
  return r.detach;
}
