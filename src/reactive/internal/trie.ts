export interface Trie<T> {
  childFor_(v: T): Trie<T>;
  trace_(): readonly T[];
}

export function createTrie<T>(): Trie<T>;
export function createTrie<T>(parent: Trie<T>, key: T): Trie<T>;
export function createTrie<T>(parent?: Trie<T>, key?: T): Trie<T> {
  const children: Map<T, WeakRef<Trie<T>>> = new Map();
  let cache: WeakRef<T[]> | null = null;

  const ret = {
    childFor_(v: T): Trie<T> {
      const childCache = children.get(v)?.deref();
      if (childCache) return childCache;

      const c = createTrie(ret, v);
      children.set(v, new WeakRef(c));
      return c;
    },

    trace_(): readonly T[] {
      let ret = cache && cache.deref();
      if (!ret) {
        ret = parent ? parent.trace_().concat(key!) : [];
        cache = new WeakRef(ret);
      }
      return ret;
    }
  };
  return ret;
}
