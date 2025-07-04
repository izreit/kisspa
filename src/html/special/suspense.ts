import { type AssembleContext, assemble, createBackingCommon, createSpecial, disposeBackings, mountBackings } from "../core/assemble.js";
import type { Backing, JSXNode, PropChildren } from "../core/types.js";
import { doNothing, isFunction, mapCoerce } from "../core/util.js";
import { createWaiter } from "../core/waiter.js";

export namespace Suspense {
  export interface Props {
    fallback?: JSXNode;
    errorFallback?: JSXNode | ((error: unknown, reset: () => void) => JSXNode);
    children?: PropChildren;
  }
}

export const Suspense = createSpecial(function Suspense(actx: AssembleContext, props: Suspense.Props): Backing {
  let childBackings: Backing[] | null | undefined;
  let currentBackings: Backing[] | null | undefined;

  const { fallback, errorFallback, children } = props;
  const base = createBackingCommon("Suspense", () => currentBackings);

  const setCurrent = (bs: Backing[] | null | undefined): void => {
    disposeBackings(currentBackings);
    mountBackings(bs, base.location_);
    currentBackings = bs;
  };

  const showChildBackings = () => setCurrent(childBackings);
  const assembleFallback = () => setCurrent(fallback ? [assemble(actx, fallback)] : null);
  const assembleErrorFallback = (e: any) => {
    setCurrent(
      errorFallback ?
        [assemble(actx, isFunction(errorFallback) ? errorFallback(e, start) : errorFallback)] :
        null
    );
  };

  const waiter = createWaiter(assembleFallback, showChildBackings, assembleErrorFallback);
  const childActx: AssembleContext = { ...actx, suspenseContext_: waiter };

  const start = () => {
    try {
      disposeBackings(childBackings);
      childBackings = mapCoerce(children, c => assemble(childActx, c));

      if (waiter.isWaiting_()) {
        // As <Suspense />, we need .catch() to stop propagation of rejection.
        actx.rootSuspenseContext_.add_(waiter.current_().catch(doNothing));
      } else {
        showChildBackings();
      }
    } catch (e) {
      assembleErrorFallback(e);
    }
  };
  start();

  return base;
});
