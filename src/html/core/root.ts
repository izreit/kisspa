import { assemble, createLocation } from "./assemble.js";
import type { Backing, JSXNode } from "./types.js";
import { doNothing } from "./util.js";
import { createWaiter } from "./waiter.js";

export interface Root {
  attach(jnode: JSXNode): Promise<unknown>;
  detach(): void;
}

export function createRoot(parent: Element | null | undefined, prev?: Node | null): Root {
  let b: Backing | null | undefined;
  const attach = (jnode: JSXNode) => {
    const waiter = createWaiter(doNothing, doNothing, doNothing);
    b && b.dispose();
    b = assemble({ lifecycleContext_: null, suspenseContext_: waiter }, jnode);
    b.mount(createLocation(parent || prev!.parentElement, prev));
    return waiter.currentPromise_();
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
