import { Backing, assemble, assignLocation, createLocation, createSpecial, tailOf } from "../core/backing";
import { disposeBackings, insertBackings, tailOfBackings } from "../core/specialHelper";
import { PropChildren } from "../core/types";
import { lastOf, mapCoerce } from "../core/util";

export namespace Portal {
  export type SrcProps = {
    to: object;
    children?: PropChildren;
  };
  export type DestProps = {
    from: object;
    children?: PropChildren; // children is not used but required for type inference...
  }
  export type Props = DestProps | SrcProps;
}

interface PortalDestBacking extends Backing {
  addChild(b: Backing): void;
  removeChild(b: Backing): void;
}

function createPortalDestBacking(): PortalDestBacking {
  const childBackings: Backing[] = [];
  let loc = createLocation();
  return {
    insert: (l): void => {
      if (assignLocation(loc, l))
        insertBackings(childBackings, l?.parent ? l : null);
    },
    tail: () => tailOfBackings(childBackings, loc?.prev),
    dispose: () => disposeBackings(childBackings),
    addChild: (b: Backing): void => {
      if (loc.parent)
        b.insert(createLocation(loc.parent, lastOf(childBackings)));
      childBackings.push(b);
    },
    removeChild: (b: Backing): void => {
      const i = childBackings.indexOf(b);
      b.insert(null);
      childBackings.splice(i, 1);
    },
    name: "PortalDest"
  };
}

const destBackings: WeakMap<object, PortalDestBacking> = new WeakMap();

export function hasPortalDestBackingFor(key: object): boolean {
  return destBackings.has(key);
}

export function destBackingFor(key: object): PortalDestBacking {
  return destBackings.get(key) ?? (destBackings.set(key, createPortalDestBacking()).get(key)!);
}

export function createPortalSrcBacking(props: Portal.SrcProps): Backing {
  const { to, children } = props;

  let childBackings: Backing[] | null = null;
  let showing = false;
  let virtualLoc = createLocation();
  let physicalLoc = createLocation();

  function updateShow(): void {
    const toShow = !!(virtualLoc.parent && physicalLoc.parent);
    if (showing === toShow) return;
    showing = toShow;
    if (toShow) {
      if (!childBackings)
        childBackings = mapCoerce(children, c => assemble(c));
      insertBackings(childBackings, physicalLoc);
    } else {
      disposeBackings(childBackings);
    }
  }

  const physicalBacking: Backing = {
    insert: l => {
      if (assignLocation(physicalLoc, l))
        updateShow();
    },
    tail: () => tailOfBackings(childBackings, physicalLoc?.prev),
    dispose: () => {},
    name: "PortalSrcPhys",
  };

  destBackingFor(to).addChild(physicalBacking);

  return {
    insert: (l) => {
      if (assignLocation(virtualLoc, l))
        updateShow();
    },
    tail: () => tailOf(virtualLoc.prev),
    dispose: () => {
      disposeBackings(childBackings);
      destBackingFor(to).removeChild(physicalBacking);
    },
    name: "PortalSrcVirt",
  };
}

export const Portal = createSpecial((props: Portal.Props): Backing => {
  return ("to" in props) ? createPortalSrcBacking(props) : destBackingFor(props.from);
});
