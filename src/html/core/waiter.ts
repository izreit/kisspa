import type { SuspenseContext } from "./types.js";

export interface Waiter extends SuspenseContext {
  add_(p: Promise<void>): void;
  then_(onfulfilled: () => void): void;
  isWaiting_(): boolean;
  currentPromise_(): Promise<void>;
}

export function createWaiter(
  onResolve: () => void,
  onReject: (e: unknown) => void,
  onStart: () => void,
): Waiter {
  let generation = 0;
  let waiting = 0;
  let allPromise: Promise<void> = Promise.resolve();
  let resolve: () => void;
  let reject: (e: unknown) => void;

  return {
    add_(promise): void {
      // start the next promise, if there is no waiting (alive) one
      if (waiting++ === 0) {
        allPromise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
        onStart();
      }

      const genStart = generation;
      promise.then(
        () => (
          // if `promise` is alive (i.e. `generation` is unchanged), decrement the waiting count.
          // (otherwise the promise has already reset and there is nothing to do.)
          genStart === generation && --waiting === 0 && (resolve(), onResolve())
        ),
        e => {
          // if `promise` is alive (i.e. `generation` is unchanged), reject and reset the current promise.
          // (otherwise the promise has already reset and there is nothing to do.)
          if (genStart === generation) {
            generation = (generation + 1) & 0xffff;
            waiting = 0;
            reject(e);
            onReject(e);
            allPromise = Promise.resolve();
          }
        }
      );
    },
    then_: (onfulfilled) => allPromise.then(onfulfilled),
    isWaiting_: () => waiting > 0,
    currentPromise_: () => allPromise,
  };
}
