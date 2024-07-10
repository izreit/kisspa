import { JSXNode } from "./types";
import { Backing, assemble } from "./backing";

export interface BackingRoot {
  attach(jnode: JSXNode): void;
  detach(): void;
}

export function createRoot(parent: Element): BackingRoot {
  let b: Backing | null = null;
  const attach = (jnode: JSXNode) => {
    b?.dispose();
    b = assemble(jnode);
    b.insert({ parent, prev: null });
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
