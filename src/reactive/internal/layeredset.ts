import { assert } from "../assert";

export interface LayeredSet<T> {
  save_(): void;
  restore_(): void;
  has_(v: T): boolean;
  add_(v: T): void;
}

export function createLayeredSet<T>(): LayeredSet<T> {
  let current: T[] = [];
  const layers: T[][] = [current];
  const map: Map<T, number> = new Map();

  return {
    save_(): void {
      current = [];
      layers.push(current);
    },

    restore_(): void {
      const l = layers.pop();
      current = layers[layers.length - 1];
      assert(!!l, "LayeredSet overrun");
      for (let i = 0; i < l.length; ++i) {
        const v = l[i];
        const count = map.get(v)!;
        if (count === 1) {
          map.delete(v);
        } else {
          map.set(v, count - 1);
        }
      }
    },

    has_: (v: T): boolean => map.has(v),

    add_(v: T): void {
      map.set(v, map.has(v) ? map.get(v)! + 1 : 1);
      current.push(v);
    }
  };
}
