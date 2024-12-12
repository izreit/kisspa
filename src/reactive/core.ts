import { assert, dceNeverReach, throwError } from "./assert";
import { decimated } from "./decimated";
import { createMapset, type Mapset } from "./internal/mapset";
import { createRefTable, type Key, type Observer, type Target, type Wrapped } from "./internal/reftable";
import { createTrie, type Trie } from "./internal/trie";

export interface StoreSetterOptions {
  lazyFlush?: boolean;
}

export interface StoreSetter<T> {
  (writer: (val: T) => void, opts?: StoreSetterOptions): void;
  autorun: (writer: (val: T) => void) => (() => void);
}

const refTable = createRefTable();

const childObservers: WeakMap<Observer, Set<Observer>> = new WeakMap();

/** Memoized table: raw value to [readProxy, writeProxy] */
const memoizedTable: WeakMap<Target | Wrapped, [Wrapped, Wrapped]> = new WeakMap();

/** Reverse map to Target */
const unwrapTable: WeakMap<Wrapped, Target> = new WeakMap();

/** cache of values: used to skip to notify observers and maintain watchDeep() watchers. */
const valueCacheTable: WeakMap<Wrapped, Map<Key, any>> = new WeakMap();

/** Stack of the current observers, used to update refTable */
const activeObserverStack: Observer[] = [];

/** Properties that currently altered and not yet notified to its observers.  */
// To reduce allocation, this is a heterogeneous array consists of
// (wrapped, key, value, prevValue, hpo), (wrapped, MUTATION_MARKER, this, arg, hpo) or (wrapped, MUTATION_MARKER, null, null, hpo)
// where 'hpo' (stands for 'has-property-observer') equals hasPropWatcher(wrapped) at the written time.
const writtens: (Wrapped | Key | any)[] = [];

const DELETE_MARKER = {};

const arrayMutators = ((a) => new Set<Function>([a.shift, a.unshift, a.push, a.pop, a.splice, a.sort]))([] as any[]);
const MUTATION_MARKER = Symbol();
let arrayMutatorCallDepth = 0;

export function debugGetInternal() {
  return { refTable, memoizedTable, parentRefTable, propWatcherTable, wrap };
}

function isWrappable(v: any): v is object {
  return (typeof v === "object" && v) || typeof v === "function";
}

function collectObserverDescendants(fun: Observer, acc: Set<Observer>): void {
  const cs = childObservers.get(fun);
  if (cs && cs.size) {
    cs.forEach(c => {
      acc.add(c);
      collectObserverDescendants(c, acc);
    });
    cs.clear();
  }
}

export function cancelAutorun(fun: Observer): void {
  const cos = new Set<Observer>();
  collectObserverDescendants(fun, cos);
  cos.forEach(refTable.clear_);
  refTable.clear_(fun);
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
        refTable.forEachObserver_(wrapped, key, fun => {
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

    observerDescendants.forEach(refTable.clear_);
    observers.forEach(fun => {
      // re-run and re-register observer, if not canceled as a descendant of others.
      if (!observerDescendants.has(fun))
        callWithObserver(fun, fun);
    });
    observers.clear();
    observerDescendants.clear();
  });
})();

const rejectWithPropName = (_target: unknown, prop: PropertyKey) => throwError(`can't set/delete '${String(prop)}' without setter`);

// Note: 'get' trap must return the original value for read-only, non-configurable data property.
// Note: `d` is just a local variable, Written in the most mififier-friendly way...
const mustGetRaw: ((o: any, p: PropertyKey) => boolean | undefined) =
  (o: any, p: PropertyKey, d?: PropertyDescriptor) =>
    ((d = Object.getOwnPropertyDescriptor(o, p)) && !d.configurable && !d.writable);

function addRef(writeProxy: Wrapped, prop: Key, val: unknown) {
  refTable.add_(writeProxy, prop, activeObserverStack[activeObserverStack.length - 1]);
  (valueCacheTable.get(writeProxy) ?? valueCacheTable.set(writeProxy, new Map()).get(writeProxy)!).set(prop, val);
}

export function observe<T extends object>(initial: T): [T, StoreSetter<T>] {
  const [readProxy, writeProxy] = wrap(initial);
  const setter = ((writer: (val: T) => void, opts: StoreSetterOptions = {}): void => {
    try {
      writer(writeProxy);
    } finally {
      if (!opts.lazyFlush) {
        while (writtens.length)
          requestFlush.immediate();
      }
    }
  }) as StoreSetter<T>;

  setter.autorun = (writer: (val: T) => void) => autorun(() => setter(writer));

  return [readProxy, setter];
}

function wrap<T extends object>(initial: T): [T, T] {
  if (memoizedTable.has(initial))
    return memoizedTable.get(initial)! as [T, T];

  const readProxy = new Proxy(initial, {
    get(target, prop, receiver) {
      const raw = unwrap(Reflect.get(target, prop, receiver));
      if (activeObserverStack.length > 0)
        addRef(writeProxy, prop, raw); // Note refTable and valueCacheTable are keyed by writeProxy
      return (!isWrappable(raw) || mustGetRaw(target, prop)) ? raw : wrap(raw)[0];
    },
    set: rejectWithPropName,
    deleteProperty: rejectWithPropName,
  });

  const writeProxy = new Proxy(initial, {
    apply(target, thisArg, argArray) {
      const rawTarget = unwrap(target as Function);
      if (!arrayMutators.has(rawTarget))
        return Reflect.apply(target as Function, thisArg, argArray);

      const wrappedSelf = wrap(thisArg)[1];
      const hasPropObserver = hasPropWatcher(wrappedSelf);
      writtens.push(wrappedSelf, MUTATION_MARKER, rawTarget, argArray, hasPropObserver);
      const ret = Reflect.apply(target as Function, thisArg, argArray);
      writtens.push(wrappedSelf, MUTATION_MARKER, null, null, hasPropObserver);
      return ret;
    },

    get(target, prop, receiver) {
      const raw = Reflect.get(target, prop, receiver);
      if (activeObserverStack.length > 0)
        addRef(writeProxy, prop, raw);
      return (!isWrappable(raw) || mustGetRaw(target, prop)) ? raw : wrap(raw)[1];
    },

    set(target, prop, value, receiver) {
      const v: any = unwrap(value);

      // Request flush only if the writing value 'v' is not identical to the cached value.
      //
      // NOTE: we cannot use the original value (i.e. Reflect.get(target, prop, receiver)) to comapre with 'v'.
      // Because some operations on 'target' may alter properties on 'target' **implicitly**.
      // For example, Array.prototype.push() called on proxy invokes the 'set' handler twice: to set an element and to update the length.
      // The latter invocation sets the length property, but the length of 'target' have already been increased by setting the element.
      // So we may miss update if we compare 'v' with the original value
      const cacheEntry = valueCacheTable.get(writeProxy);
      const cache = cacheEntry && cacheEntry.get(prop);
      if (cache !== v) {
        writtens.push(writeProxy, prop, v, cacheEntry?.has(prop) ? cache : Reflect.get(target, prop, receiver), hasPropWatcher(writeProxy));
        (cacheEntry ?? valueCacheTable.set(writeProxy, new Map()).get(writeProxy)!).set(prop, v);
        requestFlush();
      }

      return Reflect.set(target, prop, v, receiver);
    },

    deleteProperty(target, prop) {
      const cacheEntry = valueCacheTable.get(writeProxy);
      const cache = (cacheEntry && cacheEntry.has(prop)) ? cacheEntry.get(prop) : Reflect.get(target, prop);
      cacheEntry && cacheEntry.delete(prop);
      writtens.push(writeProxy, prop, DELETE_MARKER, cache, hasPropWatcher(writeProxy));
      requestFlush();

      return Reflect.deleteProperty(target, prop);
    },
  });

  const ret = [readProxy, writeProxy] as [T, T];
  memoizedTable.set(initial, ret);
  memoizedTable.set(writeProxy, ret); // Register writProxy to avoid to wrap more than once. esp. used in watchDeep().
  // memoizedTable.set(readProxy, ret); // This allows anyone to get the setter by `observe(readProxy)`.
  memoizedTable.set(readProxy, null!);
  unwrapTable.set(readProxy, initial); // Should remove? This allows anyone to get the setter by `observe(unwrap(readProxy))` .
  unwrapTable.set(writeProxy, initial);
  return ret;
}

export function unwrap<T extends object>(val: T): T {
  return unwrapTable.get(val) as T ?? val;
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
  minKey_: Key | null | undefined;
};

const propWatcherTable: WeakMap<PropWatcherId, PropWatcherEntry> = new WeakMap();
const parentRefTable: WeakMap<object /* chid */, Map<PropWatcherId, ParentRef>> = new WeakMap();

function registerParentRef(wid: PropWatcherId, target: object, key: Key, child: any, norm: number, deep: boolean) {
  if (!isWrappable(child)) return;
  child = wrap(child)[1];

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
  const wchild = wrap(child)[1];
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
  registerParentRef(wid, DUMMY_ROOT, DUMMY_SYMBOL, unwrap(target), 0, opts.deep);
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

  return getPathTrie(wid, pref.minParent_!)?.childFor_(pref.minKey_!);
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
      onApply && onApply(pathTrie.trace_(), val, prev);  // when (prop === MUTATION_HANDLER), val and prev is this and arguments. Ugh! need more readability...
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
