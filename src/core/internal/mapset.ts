export class Mapset<K, V> {
  readonly map: Map<K, Set<V>> = new Map();

  get size(): number{
    return this.map.size;
  }

  add(key: K, val: V): this {
    const { map } = this;
    (map.has(key) ? map : map.set(key, new Set())).get(key)!.add(val);
    return this;
  }

  delete(key: K, val: V): boolean {
    const { map } = this;
    if (!map.has(key))
      return false;

    const set = map.get(key)!;
    if (!set.delete(val))
      return false;

    if (set.size === 0)
      map.delete(key);
    return true;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  forEach(callback: (set: Set<V>, key: K) => void): void {
    this.map.forEach(callback);
  }

  clear(): void {
    this.map.clear();
  }
}
