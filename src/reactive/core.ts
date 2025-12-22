import { throwError } from "./assert.js";
import { decimated } from "./decimated.js";
import { createRefTable } from "./internal/reftable.js";
import { createScopedStack, type ScopedStack } from "./internal/stack.js";
import type { Key, Observer, Target, WatchHandlers, Wrapped } from "./types.js";

export interface StoreSetterOptions {
  lazyFlush?: boolean;
}

export type StoreSetter<T> = (writer: (val: T) => void, opts?: StoreSetterOptions) => void;

const refTable = createRefTable();

const childObservers: WeakMap<Observer, Set<Observer>> = new WeakMap();

/** Memoized table: raw value to [readProxy, writeProxy] */
const memoizedTable: WeakMap<Target | Wrapped, [Wrapped, Wrapped]> = new WeakMap();

/** Reverse map to Target */
const unwrapTable: WeakMap<Wrapped, Target> = new WeakMap();

/** cache of values: used to skip to notify observers and maintain watchDeep() watchers. */
const valueCacheTable: WeakMap<Wrapped, Map<Key, any>> = new WeakMap();

/** Stack of the current observers, used to update refTable */
const activeObserverStack: ScopedStack<Observer> = createScopedStack();

/** Properties that currently altered and not yet notified to its observers.  */
// To reduce allocation, this is a heterogeneous array consists of
// (wrapped, key, value, prevValue, hw), (wrapped, MUTATION_MARKER, this, arg, hw) or (wrapped, MUTATION_MARKER, 0, 0, hw)
// where 'hw' is `hasWatcher(wrapped)` at the written time.
const writtens: (Wrapped | Key | any)[] = [];

const DELETE_MARKER = Symbol();

const arrayMutators = ((a) => new Set<Function>([a.shift, a.unshift, a.push, a.pop, a.splice, a.sort]))([] as any[]);
const MUTATION_MARKER = Symbol();

const readProxyOrItselfOf = <T>(v: T): T => isWrappable(v) ? wrap(v)[0] : v;
const hasWatcher = (readProxy: Wrapped): boolean | null | undefined => watchHandlers && watchHandlers.watches(readProxy);

let arrayMutatorCallDepth = 0;

let watchHandlers: WatchHandlers | null | undefined;

export function setWatchHandlers(h: WatchHandlers | null): void {
  watchHandlers = h;
}

export function debugGetInternal() {
  return { refTable, memoizedTable, wrap };
}

function isWrappable(v: any): v is object {
  return (typeof v === "object" && v) || typeof v === "function";
}

function collectObserverDescendants(fun: Observer, acc: Set<Observer>): void {
  const cs = childObservers.get(fun);
  if (cs && cs.size) {
    for (const c of cs)
      collectObserverDescendants(c, acc.add(c));
    cs.clear();
  }
}

export function cancelEffect(fun: Observer): void {
  const cos = new Set<Observer>();
  collectObserverDescendants(fun, cos);
  cos.forEach(refTable.clear_);
  refTable.clear_(fun);
}

export const requestFlush = (() => {
  return decimated(() => {
    if (!writtens.length) return;
    const observers = new Set<Observer>();
    const observerDescendants = new Set<Observer>();

    for (let i = 0; i < writtens.length; i += 5) {
      const wrapped = writtens[i];
      const key = writtens[i + 1]; // key or MUTATION_MARKER
      const val = writtens[i + 2]; // val or (thisArg or 0) for MUTATION_MARKER
      const prev = writtens[i + 3] // prev or (argArray or 0) for MUTATION_MARKER
      const isWatched = writtens[i + 4];

      // NOTE checking isWatched is important for not only performance but also right behavior especially for MUTATION_MARKER.
      // if no property observer found at the written time, no MUTATION_MARKER is required. Moreover, thisArg (val) may be a property
      // which has notified earlier in this loop as the value mutated by target (one of arrayMutators).
      // In this case notifying mutation with MUTATION_MARKER causes duplication.

      if (key !== MUTATION_MARKER) {
        // collect watchers
        refTable.forEachObserver_(wrapped, key, fun => {
          collectObserverDescendants(fun, observerDescendants);
          observers.add(fun);
        });
        if (watchHandlers && isWatched)
          watchHandlers.set(wrapped, key, readProxyOrItselfOf(val), readProxyOrItselfOf(prev), val === DELETE_MARKER, arrayMutatorCallDepth > 0);
      } else {
        // NOTE here `val` is a `function` being called or `0` which is the end marker of function calling.
        arrayMutatorCallDepth += (val ? 1 : -1);
        if (watchHandlers && isWatched && val)
          watchHandlers.call(wrapped, val, prev);
      }
    }
    writtens.length = 0;
    watchHandlers && watchHandlers.flush();

    observerDescendants.forEach(refTable.clear_);
    for (const observer of observers) {
      // re-run and re-register observer, if it's
      if (
        !observerDescendants.has(observer) && // not a descendant of other observers (will be re-registered by them), and
        refTable.observing_(observer) // not canceled by preceding observers.
      ) {
        activeObserverStack.callWith_(observer, observer);
      }
    }
    observers.clear();
    observerDescendants.clear();
  });
})();

const rejectWithPropName = (_target: unknown, prop: PropertyKey) => throwError(`can't alter '${String(prop)}' without setter`);

// Note: 'get' trap must return the original value for read-only, non-configurable data property.
// Note: `d` is just a local variable, Written in the most mififier-friendly way...
const mustGetRaw: ((o: any, p: PropertyKey) => boolean | undefined) =
  (o: any, p: PropertyKey, d?: PropertyDescriptor) =>
    ((d = Object.getOwnPropertyDescriptor(o, p)) && !d.configurable && !d.writable);

function addRef(readProxy: Wrapped, prop: Key, val: unknown) {
  const observer = activeObserverStack.top_();
  if (observer) {
    refTable.add_(readProxy, prop, observer);
    (valueCacheTable.get(readProxy) ?? valueCacheTable.set(readProxy, new Map()).get(readProxy)!).set(prop, val);
  }
}

export function createStore<T extends object>(initial: T): [T, StoreSetter<T>] {
  const [readProxy, writeProxy] = wrap(initial);
  const setter = (writer: (val: T) => void, opts: StoreSetterOptions = {}): void => {
    try {
      writer(writeProxy);
    } finally {
      if (!opts.lazyFlush) {
        while (writtens.length)
          requestFlush.immediate();
      }
    }
  };
  return [readProxy, setter];
}

function wrap<T extends object>(initial: T): [T, T] {
  if (memoizedTable.has(initial))
    return memoizedTable.get(initial)! as [T, T];

  const readProxy = new Proxy(initial, {
    get(target, prop, receiver) {
      const raw = unwrap(Reflect.get(target, prop, receiver));
      addRef(readProxy, prop, raw); // Note refTable and valueCacheTable are keyed by writeProxy
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

      const wrappedSelf = wrap(thisArg)[0];
      const isWatched = hasWatcher(wrappedSelf);
      writtens.push(wrappedSelf, MUTATION_MARKER, rawTarget, argArray, isWatched);
      const ret = Reflect.apply(target as Function, thisArg, argArray);
      writtens.push(wrappedSelf, MUTATION_MARKER, 0, 0, isWatched);
      return ret;
    },

    get(target, prop, receiver) {
      const raw = Reflect.get(target, prop, receiver);
      addRef(readProxy, prop, raw);
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
      // So we may miss update if we compare 'v' with the original value.
      const cacheEntry = valueCacheTable.get(readProxy);
      const cache = cacheEntry && cacheEntry.get(prop);
      if (cache !== v) {
        writtens.push(readProxy, prop, v, cacheEntry?.has(prop) ? cache : Reflect.get(target, prop, receiver), hasWatcher(readProxy));
        (cacheEntry ?? valueCacheTable.set(readProxy, new Map()).get(readProxy)!).set(prop, v);
        requestFlush();
      }

      return Reflect.set(target, prop, v, receiver);
    },

    deleteProperty(target, prop) {
      const cacheEntry = valueCacheTable.get(readProxy);
      const cache = (cacheEntry && cacheEntry.has(prop)) ? cacheEntry.get(prop) : Reflect.get(target, prop);
      cacheEntry && cacheEntry.delete(prop);
      writtens.push(readProxy, prop, DELETE_MARKER, cache, hasWatcher(readProxy));
      requestFlush();

      return Reflect.deleteProperty(target, prop);
    },
  });

  const ret = [readProxy, writeProxy] as [T, T];
  memoizedTable.set(initial, ret);
  memoizedTable.set(writeProxy, ret); // Register writProxy to avoid to wrap more than once.
  // memoizedTable.set(readProxy, ret); // This allows anyone to get the setter by `createStore(readProxy)`.
  memoizedTable.set(readProxy, null!); // Prevent wrapping twice.
  unwrapTable.set(readProxy, initial); // Should remove? This allows anyone to get the setter by `createStore(unwrap(readProxy))` .
  unwrapTable.set(writeProxy, initial);
  return ret;
}

export function unwrap<T extends object>(val: T): T {
  return unwrapTable.get(val) as T ?? val;
}

function autorunImpl<T>(fun: () => T, observer: (() => void) | null | undefined): T {
  const parentObserver = activeObserverStack.top_();
  if (observer && parentObserver)
    (childObservers.get(parentObserver) ?? (childObservers.set(parentObserver, new Set())).get(parentObserver))!.add(observer);
  return activeObserverStack.callWith_(fun, observer);
}

const releaser = new FinalizationRegistry(cancelEffect);

export function createEffect(fun: () => void, owner?: object): () => void {
  autorunImpl(fun, fun);
  owner && releaser.register(owner, fun);
  return () => cancelEffect(fun);
}

function bindObserverImpl<A extends [...any], R>(fun: (...args: A) => R, observer: (() => void) | null | undefined): (...args: A) => R {
  return (...args: A) => autorunImpl(() => fun(...args), observer);
}

export function bindObserver<A extends [...any], R>(fun: (...args: A) => R, observer?: (() => void) | null | undefined): (...args: A) => R {
  return bindObserverImpl(fun, observer ?? activeObserverStack.top_());
}

export function withoutObserver<T>(fun: () => T): T {
  return activeObserverStack.callWith_(fun, null);
}
