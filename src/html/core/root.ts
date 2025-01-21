import { type Backing, assemble, createLocation } from "./backing.js";
import type { JSXNode } from "./types.js";

export interface Root {
  attach(jnode: JSXNode): Promise<unknown>;
  detach(): void;
}

export function createRoot(parent: Element | null | undefined, prev?: Node | null): Root {
  let b: Backing | null | undefined;
  const attach = (jnode: JSXNode) => {
    const suspenseContext: Promise<void>[] = [];
    b && b.dispose();
    b = assemble({ suspenseContext_: suspenseContext }, jnode);
    b.insert(createLocation(parent || prev!.parentElement, prev));
    return Promise.all(suspenseContext);
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
