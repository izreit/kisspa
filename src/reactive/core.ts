import { assert, dceNeverReach, throwError } from "./assert";
import { decimated } from "./decimated";
import { createTrie, Trie } from "./internal/trie";
import { createMapset, Mapset } from "./internal/mapset";
import { createLayeredSet, LayeredSet } from "./internal/layeredset";

export type Key = string | symbol | number;
type Target = any;
type Wrapped = any;
type Observer = () => void;

export interface StoreSetterOptions {
  lazyFlush?: boolean;
}

export interface StoreSetter<T> {
  <U>(writer: (val: T) => U, opts?: StoreSetterOptions): U;
  autorun: (writer: (val: T) => void) => void;
}

/** Target to Observer table */
const refs: WeakMap<Wrapped, Map<Key, Set<Observer>>> = new WeakMap();

/** Observer to Target table */
const revRefs: WeakMap<Observer, Map<Wrapped, Set<Key>>> = new WeakMap();

const childObservers: WeakMap<Observer, Set<Observer>> = new WeakMap();

/** Memoized table */
const memoizedTable: WeakMap<Target | Wrapped, [Wrapped, StoreSetter<Wrapped>]> = new WeakMap();

/** Reverse map to Target */
const unwrapTable: WeakMap<Wrapped, Target> = new WeakMap();

/** cache of values: used to skip to notify observers and maintain watchDeep() watchers. */
const valueCacheTable: WeakMap<Wrapped, Map<Key, any>> = new WeakMap();

/** Wrapped values retrieved inside the ongoing setter callbacks. Modifications are rejected unless through the values registered here. */
// NOTE not WeakSet, to use clear(). Never causes leak since it always be cleared at the finally clause in setter.
const writings: LayeredSet<Wrapped> = createLayeredSet();

/** Stack of the current observers, used to update refs/revRefs */
let activeObserverStack: Observer[] = [];

/** Properties that currently altered and not yet notified to its observers.  */
// To reduce allocation, this is a heterogeneous array consists of
// (wrapped, key, value, prevValue, hpo), (wrapped, MUTATION_MARKER, this, arg, hpo) or (wrapped, MUTATION_MARKER, null, null, hpo)
// where 'hpo' (stands for 'has-property-observer') equals hasPropWatcher(wrapped) at the written time.
const writtens: (Wrapped | Key | any)[] = [];

// const propObserverTable: WeakMap<Wrapped, Map<Wrapped, Map<Key, Set<(prop: Key, val: any, prev: any) => void>>>> = new WeakMap();

const DELETE_MARKER = {};

const arrayMutators = ((a) => new Set<Function>([a.shift, a.unshift, a.push, a.pop, a.splice]))([] as any[]);
const MUTATION_MARKER = Symbol();
let arrayMutatorCallDepth = 0;

export function debugGetInternal() {
  return { refs, revRefs, memoizedTable, parentRefTable, propWatcherTable };
}

function isWrappable(v: any): v is object {
  return (typeof v === "object" && v) || typeof v === "function";
}

function collectObserverDescendants(fun: Observer, acc: Set<Observer>): void {
  const cs = childObservers.get(fun);
  if (cs?.size) {
    cs.forEach(c => {
      acc.add(c);
      collectObserverDescendants(c, acc);
    });
    cs.clear();
  }
}

function clearRefsTo(fun: Observer): void {
  const revent = revRefs.get(fun);
  if (revent?.size) {
    revent.forEach((keys, wrapped) => {
      const ref = refs.get(wrapped);
      if (ref)
        keys.forEach(key => ref.get(key)?.delete(fun));
    });
    revent.clear();
  }
}

export function cancelAutorun(fun: Observer): void {
  const cos = new Set<Observer>();
  collectObserverDescendants(fun, cos);
  cos.forEach(clearRefsTo);
  clearRefsTo(fun)
}

export const requestFlush = (() => {
  const observers = new Set<Observer>();
  const observerDescendants = new Set<Observer>();

  return decimated(function flush() {
    if (!writtens.length) return;

    for (let i = 0; i < writtens.length; i += 5) {
      const wrapped = writtens[i];
      const key = writtens[i + 1]; // or MUTATION_MARKER
      const val = writtens[i + 2]; // or thisArg/null for MUTATION_MARKER
      const prev = writtens[i + 3] // or argArray/null for MUTATION_MARKER
      const hasPropObserver = writtens[i + 4];

      // NOTE checking hasPropObserver is important for not only performance but also right behavior especially for MUTATION_MARKER.
      // if no property observer found at the written time, no MUTATION_MARKER is required. Moreover, thisArg (val) may be a property
      // which has notified earlier in this loop as the value mutated by target (one of arrayMutators).
      // In this case notifying mutation with MUTATION_MARKER causes duplication.

      if (key !== MUTATION_MARKER) {
        // collect watchers
        refs.get(wrapped)?.get(key)?.forEach(fun => {
          collectObserverDescendants(fun, observerDescendants);
          observers.add(fun);
        });
        // fire deep watchers
        if (hasPropObserver)
          notifyPropChange(wrapped, key, val, prev);
      } else {
        arrayMutatorCallDepth += (val ? 1 : -1);
        if (hasPropObserver && val != null)
          notifyPropChange(wrapped, key, val, prev);
      }
    }
    writtens.length = 0;
    finishNotifyPropChange();

    observerDescendants.forEach(clearRefsTo);
    observers.forEach(fun => {
      // re-run and re-register observer, if not canceled as a descendant of others.
      if (!observerDescendants.has(fun))
        callWithObserver(fun, fun);
    });
    observers.clear();
    observerDescendants.clear();
  });
})();

function addRef(wrapped: any, prop: Key, value: any, observer: () => void): void {
  const refent = refs.get(wrapped) ?? refs.set(wrapped, new Map()).get(wrapped)!;
  (refent.get(prop) ?? refent.set(prop, new Set()).get(prop)!).add(observer);

  const revent = revRefs.get(observer) ?? revRefs.set(observer, new Map()).get(observer)!;
  (revent.get(wrapped) ?? revent.set(wrapped, new Set()).get(wrapped)!).add(prop);

  (valueCacheTable.get(wrapped) ?? valueCacheTable.set(wrapped, new Map()).get(wrapped)!).set(prop, value);
}

const rejectionMessageWrite = (p: string | symbol) => `can't set/delete property ${String(p)} without setter`;

export function observe<T extends object>(initial: T): [T, StoreSetter<T>] {
  if (memoizedTable.has(initial))
    return memoizedTable.get(initial)!;

  const proxy = new Proxy(initial, {
    apply: function (target, thisArg, argArray) {
      const rawTarget = unwrap(target as Function);
      if (!arrayMutators.has(rawTarget))
        return Reflect.apply(target as Function, thisArg, argArray);

      const wrappedSelf = observe(thisArg)[0];
      const hasPropObserver = hasPropWatcher(wrappedSelf);
      writtens.push(wrappedSelf, MUTATION_MARKER, rawTarget, argArray, hasPropObserver);
      const ret = Reflect.apply(target as Function, thisArg, argArray);
      writtens.push(wrappedSelf, MUTATION_MARKER, null, null, hasPropObserver);
      return ret;
    },

    get: function (target, prop, receiver) {
      const raw = Reflect.get(target, prop, receiver);

      if (activeObserverStack.length > 0) {
        addRef(proxy, prop, raw, activeObserverStack[activeObserverStack.length - 1]);
      }

      if (!isWrappable(raw))
        return raw;

      // Note: this is required by the spec. The 'get' must return the original value for read-only, non-configurable data property.
      const config = Object.getOwnPropertyDescriptor(target, prop);
      if (config && !config.configurable && !config.writable)
        return raw;

      const ret = observe(raw)[0];
      if (writings.has_(proxy)) {
        writings.add_(ret);
      }
      return ret;
    },

    set(target, prop, value, receiver) {
      if (!writings.has_(proxy))
        throwError(rejectionMessageWrite(prop));
      const v: any = unwrap(value);

      // Request flush only if the writing value 'v' is not identical to the cached value.
      //
      // NOTE: we cannot use the original value (i.e. Reflect.get(target, prop, receiver)) to comapre with 'v'.
      // Because some operations on 'target' may alter properties on 'target' **implicitly**.
      // For example, Array.prototype.push() called on proxy invokes the 'set' handler twice: to set an element and to update the length.
      // The latter invocation sets the length property, but the length of 'target' have already been increased by setting the element.
      // So we may miss update if we compare 'v' with the original value
      const cacheEntry = valueCacheTable.get(proxy);
      const cache = cacheEntry?.get(prop);
      if (cache !== v) {
        writtens.push(proxy, prop, v, cacheEntry?.has(prop) ? cache : Reflect.get(target, prop, receiver), hasPropWatcher(proxy));
        (cacheEntry ?? valueCacheTable.set(proxy, new Map()).get(proxy)!).set(prop, v);
        requestFlush();
      }

      return Reflect.set(target, prop, v, receiver);
    },

    deleteProperty(target, prop) {
      if (!writings.has_(proxy))
        throwError(rejectionMessageWrite(prop));

      const cacheEntry = valueCacheTable.get(proxy);
      const cache = cacheEntry?.has(prop) ? cacheEntry.get(prop) : Reflect.get(target, prop);
      cacheEntry?.delete(prop);
      writtens.push(proxy, prop, DELETE_MARKER, cache, hasPropWatcher(proxy));
      requestFlush();

      return Reflect.deleteProperty(target, prop);
    },
  });

  const setter = (<U>(writer: (val: T) => U, opts?: StoreSetterOptions): U => {
    const lazyFlush = opts?.lazyFlush ?? false;
    try {
      writings.save_();
      writings.add_(proxy);
      return writer(proxy);
    } finally {
      writings.restore_();
      if (!lazyFlush) {
        while (writtens.length)
          requestFlush.immediate();
      }
    }
  }) as StoreSetter<T>;

  setter.autorun = ((writer: (val: T) => void): void => {
    autorun(() => { setter(writer); });
  });

  const ret: [T, StoreSetter<T>] = [proxy, setter];
  memoizedTable.set(initial, ret);
  memoizedTable.set(proxy, ret); // also register proxy itself to avoid to wrap proxy more than once.

  unwrapTable.set(proxy, initial);
  return ret;
}

export function unwrap<T>(val: T): T {
  return unwrapTable.has(val) ? unwrapTable.get(val) : val;
}

function callWithObserver<T>(fun: () => T, observer: () => void): T {
  try {
    activeObserverStack.push(observer);
    return fun();
  } finally {
    activeObserverStack.pop();
  }
}

function autorunImpl<T>(fun: () => T, observer: () => void): T {
  const parentObserver = activeObserverStack[activeObserverStack.length - 1];
  if (parentObserver)
    (childObservers.get(parentObserver) ?? (childObservers.set(parentObserver, new Set())).get(parentObserver))!.add(observer);
  return callWithObserver(fun, observer);
}

export function autorun(fun: () => void): () => void {
  autorunImpl(fun, fun);
  return () => cancelAutorun(fun);
}

export function bindObserver<A extends [...any], R>(fun: (...args: A) => R, observer?: () => void): (...args: A) => R {
  const resolvedObserver = observer ?? activeObserverStack[activeObserverStack.length - 1];
  assert(!!resolvedObserver, "bindObserver(): neither in autorun() nor observer is given");

  return (...args: A) => {
    return autorunImpl(() => fun(...args), resolvedObserver);
  };
}

// Impossible?
/*
export function withoutObserver<T>(fun: () => T): T {
  const os = activeObserverStack;
  try {
    activeObserverStack = [];
    return fun();
  } finally {
    activeObserverStack = os;
  }
}
*/

// --- watch ----

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
  minKey_: Key | null;
};

const propWatcherTable: WeakMap<PropWatcherId, PropWatcherEntry> = new WeakMap();
const parentRefTable: WeakMap<object /* chid */, Map<PropWatcherId, ParentRef>> = new WeakMap();

function registerParentRef(wid: PropWatcherId, target: object, key: Key, child: any, norm: number, deep: boolean) {
  if (!isWrappable(child)) return;
  child = observe(child)[0];

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

  if (deep)
    Object.entries(child).forEach(([key, grandChild]) => { registerParentRef(wid, child, key, grandChild, norm + 1, true); });
}

function unregisterParentRefs(wid: PropWatcherId, parent: object, prop: Key, child: any): void {
  if (!isWrappable(child)) return;
  const wchild = observe(child)[0];
  const pref = parentRefTable.get(wchild)?.get(wid);
  if (!pref) return;
  if (pref.minParent_ == parent) {
    pref.minNorm_ = Infinity;
    pref.minKey_ = pref.minParent_ = null;
  }

  pref.locations_.delete_(parent, prop);
  if (pref.locations_.size_ === 0)
    parentRefTable.get(wchild)!.delete(wid);
}

let nextWatcherId = 0;

function watchImpl<T extends object>(target: T, opts: PropWatcherEntry): PropWatcherId {
  const wid = { id: nextWatcherId++ } as PropWatcherId; // should be the only place to cast to PropWatcherId
  propWatcherTable.set(wid, opts);
  registerParentRef(wid, DUMMY_ROOT, DUMMY_SYMBOL, target, 0, opts.deep);
  return wid;
}

export type WatchDeepOptions = Omit<PropWatcherEntry, "deep">;

export function watchDeep<T extends object>(target: T, opts: WatchDeepOptions | ((path: readonly Key[], val: any, deleted: boolean) => void)): PropWatcherId {
  if (__DCE_DISABLE_WATCH__) return dceNeverReach();
  return watchImpl(target, (typeof opts === "function") ? { onAssign: opts, deep: true } : { ...opts, deep: true });
}

export type WatchShallowOptions = Omit<PropWatcherEntry, "deep" | "onAssign" | "onApply"> & {
  onAssign: (path: Key, val: any, deleted: boolean) => void;
  onApply: ((fun: Function, args: any[]) => void) | undefined;
}

export function watchShallow<T extends object>(target: T, opts: WatchShallowOptions | ((path: Key, val: any, deleted: boolean) => void)): PropWatcherId {
  if (__DCE_DISABLE_WATCH__) return dceNeverReach();
  opts = (typeof opts === "function") ? { onAssign: opts } as WatchShallowOptions : opts;
  const { onAssign: onAssignShallow, onApply: onApplyShallow } = opts;
  const onAssign = (path: readonly Key[], val: any, deleted: boolean) => onAssignShallow(path[0], val, deleted);
  const onApply = onApplyShallow ? (_path: readonly Key[], fun: Function, args: any[]) => onApplyShallow(fun, args) : undefined;
  return watchImpl(target, { ...opts, onAssign, onApply, deep: false });
}

export function unwatch(watcherId: PropWatcherId): void {
  if (__DCE_DISABLE_WATCH__) return;
  propWatcherTable.delete(watcherId);
}

function hasPropWatcher(target: Wrapped): boolean {
  if (__DCE_DISABLE_WATCH__) return false;
  return parentRefTable.has(target);
}

const trieRoot = createTrie<Key>();

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

  return getPathTrie(wid, pref.minParent_)?.childFor_(pref.minKey_!);
}

const flushingWatchers: Set<PropWatcherId> = new Set();

function finishNotifyPropChange(): void {
  if (__DCE_DISABLE_WATCH__) return;
  flushingWatchers.forEach(wid => { propWatcherTable.get(wid)?.onEndFlush?.(); });
  flushingWatchers.clear();
}

function notifyPropChange(target: Wrapped, prop: Key, val: any, prev: any): void {
  if (__DCE_DISABLE_WATCH__) return;
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

    const { onAssign, onApply, deep } = watcher;
    if (!flushingWatchers.has(wid)) {
      flushingWatchers.add(wid);
      watcher.onStartFlush?.();
    }

    if (prop === MUTATION_MARKER) {
      onApply?.(pathTrie.trace_(), val, prev);  // when (prop === MUTATION_HANDLER), val and prev is this and arguments. Ugh! need more readability...
      return;
    }

    if (deep) {
      unregisterParentRefs(wid, target, prop, prev);
      registerParentRef(wid, target, prop, val, pref.minNorm_ + 1, true);
    }

    if (!onApply || arrayMutatorCallDepth === 0)
      onAssign(pathTrie.childFor_(prop).trace_(), (val !== DELETE_MARKER) ? val : undefined, val === DELETE_MARKER);
  });

  stale.forEach(wid => {
    if (tableFromChild.delete(wid) && tableFromChild.size === 0)
      parentRefTable.delete(target);
  });
}
