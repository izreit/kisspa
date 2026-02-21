import type { Key, Wrapped } from "../../reactive/types.js";
import { addWatchHandlers } from "./handlers.js";
import { createMapset, type Mapset } from "./internal/mapset.js";
import { createTrie, type Trie } from "./internal/trie.js";

// To avoid depending on an internal function of the main lib, copied from reactive/core.ts
const isWrappable = (v: any): v is object => (typeof v === "object" && v) || typeof v === "function";

declare const PropWatcherIdSymbol: unique symbol;
export type PropWatcherId = { id: number; [PropWatcherIdSymbol]: never };

const DUMMY_ROOT = {};
const DUMMY_SYMBOL = Symbol();

type PropWatcherEntry = {
  deep: boolean;
  onAssign: (path: readonly Key[], val: any, deleted: boolean) => void;
  onApply?: ((path: readonly Key[], fun: Function, args: any[]) => void) | undefined;
  onStartFlush?: (() => void) | undefined;
  onEndFlush?: (() => void) | undefined;
};

type ParentRef = {
  locations_: Mapset<object, Key>;
  /**
   * The minimal distance from the watcher root. Used to notify changes with the shortest path from the root.
   * This is important not only to be efficient but also to avoid infinite loop caused by cyclic references.
   */
  minNorm_: number;
  minParent_: object | null;
  minKey_: Key | null | undefined;
};

const propWatcherTable: WeakMap<PropWatcherId, PropWatcherEntry> = new WeakMap();
const parentRefTable: WeakMap<object /* chid */, Map<PropWatcherId, ParentRef>> = new WeakMap();

export function debugGetInternal() {
  return { parentRefTable, propWatcherTable };
}

function registerParentRef(wid: PropWatcherId, target: object, key: Key, child: any, norm: number, deep: boolean) {
  if (!isWrappable(child)) return;

  const tableFromChild = (parentRefTable.has(child) ? parentRefTable : (parentRefTable.set(child, new Map()))).get(child)!;
  const pref = (
    tableFromChild.has(wid) ?
      tableFromChild :
      tableFromChild.set(wid, { locations_: createMapset(), minParent_: null, minKey_: null, minNorm_: Infinity })
  ).get(wid)!;

  pref.locations_.add_(target, key);
  if (pref.minNorm_ > norm) {
    pref.minNorm_ = norm;
    pref.minParent_ = target;
    pref.minKey_ = key;
  }

  if (deep) {
    for (const [key, grandChild] of Object.entries(child))
      registerParentRef(wid, child, key, grandChild, norm + 1, true);
  }
}

function unregisterParentRefs(wid: PropWatcherId, parent: object, prop: Key, child: any): void {
  if (!isWrappable(child)) return;
  const pref = parentRefTable.get(child)?.get(wid);
  if (!pref) return;
  if (pref.minParent_ === parent) {
    pref.minNorm_ = Infinity;
    pref.minKey_ = pref.minParent_ = null;
  }

  pref.locations_.delete_(parent, prop);
  if (pref.locations_.size_ === 0)
    parentRefTable.get(child)!.delete(wid);
}

let nextWatcherId = 0;

function watchImpl<T extends object>(target: T, opts: PropWatcherEntry): PropWatcherId {
  if (nextWatcherId === 0) {
    addWatchHandlers({
      watches: hasPropWatcher,
      call: notifyCall,
      set: notifyChange,
      flush: notifyChangeFinish,
    });
  }
  const wid = { id: nextWatcherId++ } as PropWatcherId; // should be the only place to cast to PropWatcherId
  propWatcherTable.set(wid, opts);
  registerParentRef(wid, DUMMY_ROOT, DUMMY_SYMBOL, target, 0, opts.deep);
  return wid;
}

export type WatchDeepOptions = Omit<PropWatcherEntry, "deep">;

export function watchDeep<T extends object>(target: T, opts: WatchDeepOptions | ((path: readonly Key[], val: any, deleted: boolean) => void)): PropWatcherId {
  return watchImpl(target, (typeof opts === "function") ? { onAssign: opts, deep: true } : { ...opts, deep: true });
}

export type WatchShallowOptions = Omit<PropWatcherEntry, "deep" | "onAssign" | "onApply"> & {
  onAssign: (path: Key, val: any, deleted: boolean) => void;
  onApply: ((fun: Function, args: any[]) => void) | undefined;
}

export function watchShallow<T extends object>(target: T, opts: WatchShallowOptions | ((path: Key, val: any, deleted: boolean) => void)): PropWatcherId {
  opts = (typeof opts === "function") ? { onAssign: opts } as WatchShallowOptions : opts;
  const { onAssign: onAssignShallow, onApply: onApplyShallow } = opts;
  const onAssign = (path: readonly Key[], val: any, deleted: boolean) => onAssignShallow(path[0], val, deleted);
  const onApply = onApplyShallow ? (_path: readonly Key[], fun: Function, args: any[]) => onApplyShallow(fun, args) : undefined;
  return watchImpl(target, { ...opts, onAssign, onApply, deep: false });
}

export function unwatch(watcherId: PropWatcherId): void {
  propWatcherTable.delete(watcherId);
}

function hasPropWatcher(target: Wrapped): boolean {
  return parentRefTable.has(target);
}

const trieRoot = createTrie<Key>();
const flushingWatchers: Set<PropWatcherId> = new Set();

function getPathTrie(wid: PropWatcherId, target: Wrapped): Trie<Key> | null | undefined {
  const pref = parentRefTable.get(target)?.get(wid);
  if (!pref) return null; // unwatched

  // calculate minKey if invalidated
  if (!pref.minParent_) {
    let n = Infinity;
    pref.locations_.forEach_((keys, parent) => {
      const ppref = parentRefTable.get(parent)?.get(wid);
      if (ppref && n > ppref.minNorm_ + 1) {
        pref.minNorm_ = n = ppref.minNorm_ + 1;
        pref.minParent_ = parent;
        pref.minKey_ = keys.values().next().value;
      }
    })
  }

  if (pref.minKey_ === DUMMY_SYMBOL)
    return trieRoot;

  return getPathTrie(wid, pref.minParent_!)?.childFor_(pref.minKey_!);
}

function notifyChangeFinish(): void {
  for (const wid of flushingWatchers)
    propWatcherTable.get(wid)?.onEndFlush?.();
  flushingWatchers.clear();
}

function notifyCall(target: Wrapped, self: any, args: any): void {
  notifyImpl(target, (_wid, watcher, _pref, pathTrie) => {
    const { onApply } = watcher;
    onApply && onApply(pathTrie.trace_(), self, args);
  });
}

function notifyChange(target: Wrapped, prop: Key, val: any, prev: any, isDelete: boolean, isCallAlternative: boolean): void {
  notifyImpl(target, (wid, watcher, pref, pathTrie) => {
    const { onAssign, onApply, deep } = watcher;

    if (deep) {
      unregisterParentRefs(wid, target, prop, prev);
      registerParentRef(wid, target, prop, val, pref.minNorm_ + 1, true);
    }

    if (!onApply || !isCallAlternative)
      onAssign(pathTrie.childFor_(prop).trace_(), isDelete ? undefined : val, isDelete);
  });
}

function notifyImpl(target: Wrapped, fun: (wid: PropWatcherId, watcher: PropWatcherEntry, pref: ParentRef, pathTrie: Trie<Key>) => void): void {
  const tableFromChild = parentRefTable.get(target);
  if (!tableFromChild) return;

  const stale: PropWatcherId[] = [];

  tableFromChild.forEach((pref, wid) => {
    const watcher = propWatcherTable.get(wid);
    if (!watcher) { // already unwatched
      stale.push(wid);
      return;
    }
    const pathTrie = getPathTrie(wid, target);
    if (!pathTrie)
      return;

    if (!flushingWatchers.has(wid)) {
      flushingWatchers.add(wid);
      watcher.onStartFlush?.();
    }

    fun(wid, watcher, pref, pathTrie);
  });

  for (const wid of stale) {
    if (tableFromChild.delete(wid) && tableFromChild.size === 0)
      parentRefTable.delete(target);
  }
}
