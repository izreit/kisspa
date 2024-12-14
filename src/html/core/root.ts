import { type Backing, assemble, createLocation } from "./backing";
import type { JSXNode } from "./types";

export interface Root {
  attach(jnode: JSXNode): void;
  detach(): void;
}

export function createRoot(parent: Element | null | undefined, prev?: Node | null): Root {
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

export function attach(jnode: JSXNode, location: Element | null | undefined, prev?: Node | null): Root {
  const r = createRoot(location, prev);
  r.attach(jnode);
  return r;
}
