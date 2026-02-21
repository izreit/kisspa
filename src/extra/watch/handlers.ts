import { setWatchHandlers, type WatchHandlers } from "../../reactive/index.js";

const handlersSet = new Set<WatchHandlers>();

function someOfSet<T>(self: Set<T>, fun: (val: T) => boolean): boolean {
  for (const val of self) {
    if (fun(val))
      return true;
  }
  return false;
}

const proxyHandlers: WatchHandlers = {
  watches: target => someOfSet(handlersSet, hs => hs.watches(target)),
  flush: () => handlersSet.forEach(hs => hs.flush()),
  call: (target, self, args) => handlersSet.forEach(hs => hs.call(target, self, args)),
  set: (target, prop, val, prev, isDelete, isCallAlternative) =>
    handlersSet.forEach(hs => hs.set(target, prop, val, prev, isDelete, isCallAlternative)),
};

export function addWatchHandlers(hs: WatchHandlers): void {
  if (!handlersSet.size)
    setWatchHandlers(proxyHandlers);
  handlersSet.add(hs);
}

export function removeWatchHandlers(hs: WatchHandlers): void {
  handlersSet.delete(hs);
  if (!handlersSet.size)
    setWatchHandlers(null);
}
