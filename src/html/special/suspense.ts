import { AssembleContext, Backing, BackingLocation, assemble, assignLocation, createLocation, createSpecial } from "../core/backing";
import { disposeBackings, insertBackings, tailOfBackings } from "../core/specialHelper";
import { JSXNode, PropChildren } from "../core/types";
import { arrayify, mapCoerce } from "../core/util";

export namespace Suspense {
  export interface Props {
    fallback?: JSXNode;
    errorFallback?: JSXNode | ((error: unknown, reset: () => void) => JSXNode);
    children?: PropChildren;
  }
}

interface AllWaiter {
  push(p: Promise<void>): void;
  then(f: () => void): this;
  catch(f: (e: unknown) => void): this;
}

function createAllWaiter(): AllWaiter {
  let generation = 0;
  let waiting = 0;
  let allPromise: Promise<void>, resolve: () => void, reject: (e: unknown) => void;

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
    push(promise: Promise<void>): void {
      if (waiting++ === 0) start();
      const genStart = generation;
      promise
        .then(() => (genStart === generation && --waiting === 0 && resolve()))
        .catch(e => (genStart === generation && suspend(e)));
    },
    then: (f: () => void) => (allPromise.then(f), ret),
    catch: (f: (e: unknown) => void) => (allPromise.catch(f), ret),
  };
  return ret;
}

export const Suspense = createSpecial(function Suspense(actx: AssembleContext, props: Suspense.Props): Backing {
  const { fallback, errorFallback, children } = props;
  let loc = createLocation();
  let fallbackBackings: Backing[] | null = null;
  let errorFallbackBackings: Backing[] | null = null;
  let backings: Backing[];

  let currentBackings: Backing[] | null = null;
  const setCurrent = (bs: Backing[] | null): void => {
    insertBackings(currentBackings, null);
    insertBackings(bs, loc);
    currentBackings = bs;
  };

  const handleError = (e: any) => {
    errorFallbackBackings = errorFallback ?
      [assemble(actx, typeof errorFallback === "function" ? errorFallback(e, start) : errorFallback)] :
      null;
    setCurrent(errorFallbackBackings);
  };

  const waiter = createAllWaiter();

  const push = (p: Promise<void> | Promise<void>[]) => {
    const ps = arrayify(p);
    if (ps.length > 0) {
      ps.forEach(p => waiter.push(p));
      waiter.then(() => {
        setCurrent(backings);
        disposeBackings(fallbackBackings);
        fallbackBackings = null;
      }).catch(handleError);
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
      const childActx: AssembleContext = { suspenseContext_: promises };
      backings = mapCoerce(children, c => assemble(childActx, c));

      // NOTE It's important to overwrite suspenseContext_ to make it accessible from `children` through `childActx` later.
      // (e.g. A <Show> inside children may be toggled later, assemble() of its descendant and obtain Promise)
      childActx.suspenseContext_ = { push };

      push(promises);
    } catch (e) {
      handleError(e);
    }
  };
  start();

  const insert = (l: BackingLocation | null | undefined) => {
    if (assignLocation(loc, l))
      insertBackings(currentBackings, loc);
  };
  const tail = () => tailOfBackings(currentBackings, loc.prev);
  const dispose = () => disposeBackings(currentBackings);
  return { insert, tail, dispose, name: "Suspense" };
});
