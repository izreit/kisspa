export class Trie<T> {
  readonly parent: Trie<T> | null;
  readonly key: T | null;
  protected children: Map<T, WeakRef<Trie<T>>> = new Map();
  protected cache: WeakRef<T[]> | null = null;

  constructor();
  constructor(parent: Trie<T>, key: T);
  constructor(parent?: Trie<T>, key?: T) {
    this.parent = parent ?? null;
    this.key = key ?? null;
  }

  childFor(v: T): Trie<T> {
    const cache = this.children.get(v)?.deref();
    if (cache) return cache;

    const c = new Trie(this, v);
    this.children.set(v, new WeakRef(c));
    return c;
  }

  trace(): readonly T[] {
    const c = this.cache?.deref();
    if (c) return c;

    const ret = this.parent?.trace().concat(this.key!) ?? [];
    this.cache = new WeakRef(ret);
    return ret;
  }
}
