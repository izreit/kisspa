import { type AssembleContext, type Backing, assemble, createBackingCommon, createSpecial, disposeBackings, insertBackings } from "../core/backing";
import type { JSXNode, PropChildren } from "../core/types";
import { arrayify, isFunction, mapCoerce } from "../core/util";

export namespace Suspense {
  export interface Props {
    fallback?: JSXNode;
    errorFallback?: JSXNode | ((error: unknown, reset: () => void) => JSXNode);
    children?: PropChildren;
  }
}

interface AllWaiter {
  push_(p: Promise<void>): void;
  then_(onfulfilled: () => void, onrejected: (e: unknown) => void): this;
  currentPromise_(): Promise<void>;
}

function createAllWaiter(): AllWaiter {
  let generation = 0;
  let waiting = 0;
  let allPromise: Promise<void> = Promise.resolve();
  let resolve: () => void;
  let reject: (e: unknown) => void;

  function suspend(e: unknown) {
    generation = (generation + 1) & 0xffff;
    waiting = 0;
    reject(e);
    allPromise = Promise.resolve();
  }
  function start() {
    allPromise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  }

  const ret: AllWaiter = {
    push_(promise): void {
      if (waiting++ === 0) start();
      const genStart = generation;
      promise.then(
        () => (genStart === generation && --waiting === 0 && resolve()),
        e => (genStart === generation && suspend(e))
      );
    },
    then_: (onfulfilled, onrejected) => (allPromise.then(onfulfilled, onrejected), ret),
    currentPromise_: () => allPromise,
  };
  return ret;
}

export const Suspense = createSpecial(function Suspense(actx: AssembleContext, props: Suspense.Props): Backing {
  const { fallback, errorFallback, children } = props;

  let fallbackBackings: Backing[] | null | undefined;
  let errorFallbackBackings: Backing[] | null | undefined;
  let backings: Backing[];

  let currentBackings: Backing[] | null | undefined;
  const base = createBackingCommon("Suspense", () => currentBackings);

  const setCurrent = (bs: Backing[] | null | undefined): void => {
    insertBackings(currentBackings, null);
    insertBackings(bs, base.location_);
    currentBackings = bs;
  };

  const handleError = (e: any) => {
    errorFallbackBackings = errorFallback ?
      [assemble(actx, isFunction(errorFallback) ? errorFallback(e, start) : errorFallback)] :
      null;
    setCurrent(errorFallbackBackings);
  };

  const waiter = createAllWaiter();

  const push = (p: Promise<void> | Promise<void>[]) => {
    const ps = arrayify(p);
    if (ps.length > 0) {
      for (const p of ps)
        waiter.push_(p);
      waiter.then_(
        () => {
          setCurrent(backings);
          disposeBackings(fallbackBackings);
          fallbackBackings = null;
        },
        handleError
      );
      fallbackBackings = fallback ? [assemble(actx, fallback)] : null;
      setCurrent(fallbackBackings);
    } else {
      setCurrent(backings);
    }
  };

  const start = () => {
    try {
      disposeBackings(errorFallbackBackings);
      errorFallbackBackings = null;
      disposeBackings(backings);

      const promises: Promise<any>[] = [];
      const childActx: AssembleContext = { ...actx, suspenseContext_: promises };
      backings = mapCoerce(children, c => assemble(childActx, c));
      push(promises);

      // As <Suspense />, we need .catch() to stop propagation of rejection.
      actx.suspenseContext_.push(waiter.currentPromise_().catch(_ => {}));

      // NOTE It's important to overwrite suspenseContext_ to make it accessible from `children` through `childActx` later.
      // (e.g. A <Show> inside children may be shown later, assemble() the descendants and obtains Promises)
      childActx.suspenseContext_ = { push };
    } catch (e) {
      handleError(e);
    }
  };
  start();

  return base;
});
