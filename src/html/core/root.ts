import { assemble, createLocation } from "./assemble.js";
import type { Backing, JSXNode } from "./types.js";
import { doNothing } from "./util.js";
import { createWaiter } from "./waiter.js";

export interface Root {
  attach(jnode: JSXNode): Promise<unknown>;
  detach(): void;
  flush(): Promise<void>;
}

export function createRoot(parent: Element, prev?: Node | null): Root {
  let b: Backing | null | undefined;
  const rootWaiter = createWaiter();
  const attach = (jnode: JSXNode) => {
    const waiter = createWaiter();
    b && b.dispose();
    b = assemble(
      {
        lifecycleContext_: null,
        suspenseContext_: waiter,
        rootSuspenseContext_: rootWaiter,
        disposeContext_: doNothing,
      },
      jnode
    );
    b.mount(createLocation(parent, prev));
    return waiter.current_();
  };
  const detach = () => {
    b && b.dispose();
    b = null;
  };
  const flush = rootWaiter.current_;
  return { attach, detach, flush };
}

export function attach(jnode: JSXNode, parent: Element, prev?: Node | null): Root {
  const r = createRoot(parent, prev);
  r.attach(jnode);
  return r;
}
