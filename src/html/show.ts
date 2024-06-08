import { reaction } from "../core";
import { Backing, BackingLocation, assemble, assignLocation, createSpecial, insertBackings, tailOfBackings } from "./backing";
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
  let loc: BackingLocation = { parent: null, prev: null };

  function update(): void {
    if (showing) {
      fallbackBacking?.insert(null);
      if (!thenBackings)
        thenBackings = children.map(c => assemble(c));
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

  reaction(when, toShow => {
    showing = toShow;
    update();
  });

  return {
    insert: (l) => {
      assignLocation(loc, l);
      update();
    },
    tail: () => {
      return showing ?
        tailOfBackings(thenBackings, loc.prev) :
        (fallbackBacking?.tail() ?? loc.prev?.tail() ?? null);
    },
    name: "Show"
  };
});
