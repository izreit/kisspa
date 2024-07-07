export class Trie<T> {
  readonly parent_: Trie<T> | null;
  readonly key_: T | null;
  protected children_: Map<T, WeakRef<Trie<T>>> = new Map();
  protected cache_: WeakRef<T[]> | null = null;

  constructor();
  constructor(parent: Trie<T>, key: T);
  constructor(parent?: Trie<T>, key?: T) {
    this.parent_ = parent ?? null;
    this.key_ = key ?? null;
  }

  childFor_(v: T): Trie<T> {
    const cache = this.children_.get(v)?.deref();
    if (cache) return cache;

    const c = new Trie(this, v);
    this.children_.set(v, new WeakRef(c));
    return c;
  }

  trace_(): readonly T[] {
    const c = this.cache_?.deref();
    if (c) return c;

    const ret = this.parent_?.trace_().concat(this.key_!) ?? [];
    this.cache_ = new WeakRef(ret);
    return ret;
  }
}
