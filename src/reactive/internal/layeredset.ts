import { assert } from "../assert";

export class LayeredSet<T> {
  private map: Map<T, number> = new Map();
  private layers: T[][] = [[]];
  private current: T[] = this.layers[0];

  save(): void {
    this.current = [];
    this.layers.push(this.current);
  }

  restore(): void {
    const l = this.layers.pop();
    this.current = this.layers[this.layers.length - 1];
    assert(l != null, "LayeredSet#restore: overrun");
    const { map } = this;
    for (let i = 0; i < l.length; ++i) {
      const v = l[i]
      const count = map.get(v)!;
      if (count === 1) {
        map.delete(v)
      } else {
        map.set(v, count - 1);
      }
    }
  }

  has(v: T): boolean {
    return this.map.has(v);
  }

  add(v: T): void {
    const { map, current } = this;
    map.set(v, map.has(v) ? map.get(v)! + 1 : 1);
    current.push(v);
  }
}
