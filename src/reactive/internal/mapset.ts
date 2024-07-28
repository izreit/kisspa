export interface Mapset<K, V> {
  size_: number;
  add_(key: K, val: V): this;
  delete_(key: K, val: V): boolean;
  has_(key: K): boolean;
  forEach_(callback: (set: Set<V>, key: K) => void): void;
  clear_(): void;
}

export function createMapset<K, V>(): Mapset<K, V> {
  const map: Map<K, Set<V>> = new Map();

  const ret = {
    get size_(): number {
      return map.size;
    },

    add_(key: K, val: V): Mapset<K, V> {
      (map.has(key) ? map : map.set(key, new Set())).get(key)!.add(val);
      return ret;
    },

    delete_(key: K, val: V): boolean {
      const set = map.get(key);
      if (!set || !set.delete(val))
        return false;
      if (set.size === 0)
        map.delete(key);
      return true;
    },

    has_: (key: K): boolean => map.has(key),
    forEach_: (callback: (set: Set<V>, key: K) => void): void => map.forEach(callback),
    clear_: (): void => map.clear(),
  };

  return ret;
}
