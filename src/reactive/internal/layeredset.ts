import { assert } from "../assert";

export class LayeredSet<T> {
  private map_: Map<T, number> = new Map();
  private layers_: T[][] = [[]];
  private current_: T[] = this.layers_[0];

  save_(): void {
    this.current_ = [];
    this.layers_.push(this.current_);
  }

  restore_(): void {
    const l = this.layers_.pop();
    this.current_ = this.layers_[this.layers_.length - 1];
    assert(l != null, "LayeredSet#restore: overrun");
    const { map_ } = this;
    for (let i = 0; i < l.length; ++i) {
      const v = l[i]
      const count = map_.get(v)!;
      if (count === 1) {
        map_.delete(v)
      } else {
        map_.set(v, count - 1);
      }
    }
  }

  has_(v: T): boolean {
    return this.map_.has(v);
  }

  add_(v: T): void {
    const { map_, current_ } = this;
    map_.set(v, map_.has(v) ? map_.get(v)! + 1 : 1);
    current_.push(v);
  }
}
