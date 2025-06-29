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
  let fallbackBackings: Backing[] | null | undefined;
  let errorFallbackBackings: Backing[] | null | undefined;
  let backings: Backing[];
  let currentBackings: Backing[] | null | undefined;

  const { fallback, errorFallback, children } = props;
  const base = createBackingCommon("Suspense", () => currentBackings);

  const setCurrent = (bs: Backing[] | null | undefined): void => {
    disposeBackings(currentBackings);
    mountBackings(bs, base.location_);
    currentBackings = bs;
  };

  const assembleErrorFallback = (e: any) => {
    errorFallbackBackings = errorFallback ?
      [assemble(actx, isFunction(errorFallback) ? errorFallback(e, start) : errorFallback)] :
      null;
    setCurrent(errorFallbackBackings);
  };

  const assembleFallback = () => {
    fallbackBackings = fallback ? [assemble(actx, fallback)] : null;
    setCurrent(fallbackBackings);
  };

  const showBackings = () => {
    setCurrent(backings);
    disposeBackings(fallbackBackings);
    fallbackBackings = null;
  };

  const waiter = createWaiter(showBackings, assembleErrorFallback, assembleFallback);
  const childActx: AssembleContext = { ...actx, suspenseContext_: waiter };

  const start = () => {
    try {
      disposeBackings(errorFallbackBackings);
      errorFallbackBackings = null;

      disposeBackings(backings);
      backings = mapCoerce(children, c => assemble(childActx, c));

      if (waiter.isWaiting_()) {
        // As <Suspense />, we need .catch() to stop propagation of rejection.
        actx.suspenseContext_.add_(waiter.currentPromise_().catch(doNothing));
      } else {
        showBackings();
      }
    } catch (e) {
      assembleErrorFallback(e);
    }
  };
  start();

  return base;
});
