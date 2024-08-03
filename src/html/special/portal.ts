import { AssembleContext, Backing, assemble, assignLocation, createBackingCommon, createLocation, createSpecial, disposeBackings, insertBackings, tailOf, tailOfBackings } from "../core/backing";
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
  addBacking_(b: Backing): void;
  removeBacking_(b: Backing): void;
}

function createPortalDestBacking(): PortalDestBacking {
  const childBackings: Backing[] = [];
  const base = createBackingCommon("PortalDest", () => childBackings);
  const loc = base.location_;
  return {
    ...base,
    addBacking_(b: Backing): void {
      if (loc.parent)
        b.insert(createLocation(loc.parent, lastOf(childBackings)));
      childBackings.push(b);
    },
    removeBacking_(b: Backing): void {
      const i = childBackings.indexOf(b);
      b.insert();
      childBackings.splice(i, 1);
    },
  };
}

const destBackings: WeakMap<object, PortalDestBacking> = new WeakMap();

export function hasPortalDestBackingFor(key: object): boolean {
  return destBackings.has(key);
}

export function destBackingFor(key: object): PortalDestBacking {
  return destBackings.get(key) ?? (destBackings.set(key, createPortalDestBacking()).get(key)!);
}

export function createPortalSrcBacking(actx: AssembleContext, props: Portal.SrcProps): Backing {
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
      if (!childBackings)
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
    dispose: () => {},
    name: "PortalSrcPhys",
  };

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

export const Portal = createSpecial((actx: AssembleContext, props: Portal.Props): Backing => {
  return ("to" in props) ? createPortalSrcBacking(actx, props) : destBackingFor(props.from);
});
