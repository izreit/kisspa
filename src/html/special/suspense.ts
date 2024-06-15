import { Backing, BackingLocation, assemble, assignLocation, collectDelayings, createSpecial, disposeBackings, insertBackings, tailOfBackings } from "../core/backing";
import { JSXNode, PropChildren } from "../core/types";
import { mapCoerce } from "../core/util";

export namespace Suspense {
  export interface Props {
    fallback?: JSXNode;
    errorFallback?: JSXNode | ((error: unknown, reset: () => void) => JSXNode);
    children?: PropChildren;
  }
}

export const Suspense = createSpecial(function Suspense(props: Suspense.Props): Backing {
  const { fallback, errorFallback, children } = props;
  let loc: BackingLocation = { parent: null, prev: null };
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
      [assemble(typeof errorFallback === "function" ? errorFallback(e, start) : errorFallback)] :
      null;
    setCurrent(errorFallbackBackings);
  };

  const start = () => {
    try {
      disposeBackings(errorFallbackBackings);
      errorFallbackBackings = null;
      let promises: Promise<any>[];
      disposeBackings(backings);
      [backings, promises] = collectDelayings(() => mapCoerce(children, c => assemble(c)));
      if (promises.length > 0) {
        Promise.all(promises).then(() => {
          setCurrent(backings);
          disposeBackings(fallbackBackings);
          fallbackBackings = null;
        }).catch(handleError);
        fallbackBackings = fallback ? [assemble(fallback)] : null;
        setCurrent(fallbackBackings);
      } else {
        setCurrent(backings);
      }
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
