import { Backing, tailOf, BackingLocation } from "./backing";

export function tailOfBackings(bs: Backing[] | null | undefined, prev?: Backing | Node | null): Node | null | undefined {
  if (bs) {
    for (let i = bs.length - 1; i >= 0; --i) {
      const t = bs[i].tail();
      if (t)
        return t;
    }
  }
  return tailOf(prev);
}

export function insertBackings(bs: Backing[] | null, loc: BackingLocation | null | undefined): void {
  if (!bs) return;
  if (loc?.parent) {
    const parent = loc.parent;
    bs.reduce((prev, b) => (b.insert({ parent, prev }), b), loc.prev);
  } else {
    bs.forEach(b => b.insert(null));
  }
}

export function disposeBackings(bs: Backing[] | null): void {
  bs?.forEach(b => b.dispose());
}
