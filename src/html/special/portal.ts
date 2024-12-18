import { type AssembleContext, type Backing, assemble, assignLocation, createBackingCommon, createLocation, createSpecial, disposeBackings, insertBackings, tailOf, tailOfBackings } from "../core/backing";
import type { PropChildren } from "../core/types";
import { isNode } from "../core/util";
import { lastOf, mapCoerce } from "../core/util";

export namespace PortalDest {
  export type Props = {
    from: string | symbol;
  };
}

interface PortalDestBacking extends Backing {
  addBacking_(b: Backing): void;
  removeBacking_(b: Backing): void;
}

function createPortalDestBacking(): PortalDestBacking {
  const childBackings: Backing[] = [];
  const base = createBackingCommon("PortalDest", () => childBackings);
  return {
    ...base,
    addBacking_(b: Backing): void {
      if (base.location_.parent)
        b.insert(createLocation(base.location_.parent, lastOf(childBackings)));
      childBackings.push(b);
    },
    removeBacking_(b: Backing): void {
      const i = childBackings.indexOf(b);
      b.insert();
      childBackings.splice(i, 1);
    },
  };
}

const destBackings: Map<string | symbol | Node, PortalDestBacking> = new Map();

function destBackingFor(key: string | symbol | Node): PortalDestBacking {
  return destBackings.get(key) ?? (destBackings.set(key, createPortalDestBacking()).get(key)!);
}

export const PortalDest = createSpecial((_actx: AssembleContext, { from }: PortalDest.Props) => destBackingFor(from));

export namespace Portal {
  export type Props = {
    to: string | symbol | Node;
    children?: PropChildren;
  };
}

export function PortalImpl(actx: AssembleContext, props: Portal.Props): Backing {
  const { to, children } = props;

  let childBackings: Backing[] | null | undefined;
  let showing = false;
  const virtualLoc = createLocation();
  const physicalLoc = createLocation();

  function updateShow(): void {
    const toShow = !!(virtualLoc.parent && physicalLoc.parent);
    if (showing === toShow) return;
    showing = toShow;
    if (toShow) {
      // assert(!childBackings);
      childBackings = mapCoerce(children, c => assemble(actx, c));
      insertBackings(childBackings, physicalLoc);
    } else {
      disposeBackings(childBackings);
      childBackings = null;
    }
  }

  const physicalBacking: Backing = {
    insert: l => {
      if (assignLocation(physicalLoc, l))
        updateShow();
    },
    tail: () => tailOfBackings(childBackings, physicalLoc.prev),
    dispose: () => physicalBacking.insert(), // Just disconnect. Disposed along with the 'virtual' backing
    name: "PortalSrcPhys",
  };

  if (typeof to === "object" && isNode(to) && !destBackings.has(to))
    destBackingFor(to).insert(createLocation(to));

  destBackingFor(to).addBacking_(physicalBacking);

  return {
    insert: (l) => {
      if (assignLocation(virtualLoc, l))
        updateShow();
    },
    tail: () => tailOf(virtualLoc.prev),
    dispose: () => {
      disposeBackings(childBackings);
      destBackingFor(to).removeBacking_(physicalBacking);
    },
    name: "PortalSrcVirt",
  };
}

export const Portal = createSpecial(PortalImpl);
