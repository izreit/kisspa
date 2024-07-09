export class Mapset<K, V> {
  readonly map_: Map<K, Set<V>> = new Map();

  get size_(): number{
    return this.map_.size;
  }

  add_(key: K, val: V): this {
    const { map_ } = this;
    (map_.has(key) ? map_ : map_.set(key, new Set())).get(key)!.add(val);
    return this;
  }

  delete_(key: K, val: V): boolean {
    const { map_ } = this;
    if (!map_.has(key))
      return false;

    const set = map_.get(key)!;
    if (!set.delete(val))
      return false;

    if (set.size === 0)
      map_.delete(key);
    return true;
  }

  has_(key: K): boolean {
    return this.map_.has(key);
  }

  forEach_(callback: (set: Set<V>, key: K) => void): void {
    this.map_.forEach(callback);
  }

  clear_(): void {
    this.map_.clear();
  }
}
