import type { JSXNode } from "./types";
import { type Backing, assemble, createLocation } from "./backing";

export interface BackingRoot {
  attach(jnode: JSXNode): void;
  detach(): void;
}

export function createRoot(parent: Element | null | undefined, prev?: Node | null): BackingRoot {
  let b: Backing | null | undefined;
  const attach = (jnode: JSXNode) => {
    b && b.dispose();
    b = assemble({ suspenseContext_: null }, jnode);
    b.insert(createLocation(parent || prev!.parentElement, prev));
  };
  const detach = () => {
    b && b.dispose();
    b = null;
  };
  return { attach, detach };
}

export function attach(jnode: JSXNode, location: Element | null | undefined, prev?: Node | null): BackingRoot {
  const r = createRoot(location, prev);
  r.attach(jnode);
  return r;
}
