import type { Key, Observer, Wrapped } from "../types.js";

export interface RefTable {
  readonly table_: WeakMap<Wrapped, Map<Key, Set<Observer>>>;
  readonly reverseTable_: WeakMap<Observer, Map<Wrapped, Set<Key>>>;
  add_(obj: Wrapped, key: Key, o: Observer): void;
  forEachObserver_(obj: Wrapped, key: Key, f: (o: Observer) => void): void;
  observing_(o: Observer): boolean;
  clear_(o: Observer): void;
}

export function createRefTable(): RefTable {
  // Reference table (Wrapped/Key to Observer)
  // (Wrapped v -> Key k -> Observer o[] (iff. v[k] is touched in o()))
  const refTable: WeakMap<Wrapped, Map<Key, Set<Observer>>> = new WeakMap();

  // Reversed reference table (Observer to Wrapped/Key)
  // (Observer o -> Wrapped v -> Key k[] (iff. o() touches v[k]))
  const reverseRefTable: WeakMap<Observer, Map<Wrapped, Set<Key>>> = new WeakMap();

  function addToWeakMapMapSet<K1 extends object, K2, V>(wmms: WeakMap<K1, Map<K2, Set<V>>>, k1: K1, k2: K2, v: V): void {
    let ms: Map<K2, Set<V>>;
    let s: Set<V>;
    ms = wmms.get(k1) ?? (wmms.set(k1, ms = new Map()), ms);
    (ms.get(k2) ?? (ms.set(k2, s = new Set()), s)).add(v);
  }

  return {
    table_: refTable,
    reverseTable_: reverseRefTable,

    add_(obj, key, observer) {
      addToWeakMapMapSet(refTable, obj, key, observer);
      addToWeakMapMapSet(reverseRefTable, observer, obj, key);
    },

    forEachObserver_(obj: Wrapped, key: Key, f: (o: Observer) => void) {
      refTable.get(obj)?.get(key)?.forEach(f);
    },

    observing_: (observer) => !!reverseRefTable.get(observer)?.size,

    clear_(observer) {
      const revent = reverseRefTable.get(observer);
      if (revent && revent.size) {
        revent.forEach((keys, wrapped) => {
          const refent = refTable.get(wrapped)!;
          for (const key of keys)
            refent.get(key)?.delete(observer);
        });
        revent.clear();
      }
    }
  };
}
