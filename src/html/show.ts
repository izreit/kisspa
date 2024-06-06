import { reaction } from "../core";
import { Backing, assemble, createSpecial, insertBackings, tailOfBackings } from "./backing";
import { JSXNode } from "./types";

export namespace Show {
  export interface Props {
    when: () => boolean;
    fallback?: JSXNode;
    children?: JSXNode[];
  }
}

export const Show = createSpecial(function Show(props: Show.Props): Backing {
  const { when, fallback } = props;
  const children = props.children ?? [];
  let thenBackings: Backing[] | null = null;
  let fallbackBacking: Backing | null = null;
  let showing = false;
  let loc: Backing.InsertLocation = { parent: null, prev: null };

  function toggle(show: boolean): void {
    if (showing === show) return;
    showing = show;
    if (!parent) return;

    if (show) {
      fallbackBacking?.insert(null);
      if (!thenBackings) {
        thenBackings = [];
        children.forEach(c => { thenBackings!.push(assemble(c)); });
      }
      insertBackings(thenBackings, loc);
    } else {
      insertBackings(thenBackings, null);
      if (fallback) {
        if (!fallbackBacking)
          fallbackBacking = assemble(fallback);
        fallbackBacking.insert(loc);
      }
    }
  }

  function tail(): Node | null {
    if (showing) {
      return (thenBackings && tailOfBackings(thenBackings)) ?? loc?.prev?.tail() ?? null;
    } else {
      return fallbackBacking?.tail() ?? loc?.prev?.tail() ?? null;
    }
  }

  function insert(l: Backing.InsertLocation): void {
    loc = { ...l };
    toggle(!!l.parent);
  }

  reaction(when, toggle);
  return { insert, tail, name: "Show" };
});
