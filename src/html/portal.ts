import { Backing, BackingLocation, assemble, assignLocation, createSpecial, insertBackings, tailOfBackings } from "./backing";
import { ChildrenProp } from "./types";
import { arrayify, lastOf } from "./util";

export namespace Portal {
  export type SrcProps = { to: any; } & ChildrenProp;
  export type DestProps = { from: any; } & ChildrenProp; // children is not used but required for type inference...
  export type Props = DestProps | SrcProps;
}

interface PortalDestBacking extends Backing {
  addChild(b: Backing): void;
}

function createPortalDestBacking(): PortalDestBacking {
  const childBackings: Backing[] = [];
  let loc: BackingLocation | null = null;
  return {
    insert: (l: BackingLocation | null): void => {
      if (!!loc?.parent == !!l?.parent) return;
      insertBackings(childBackings, l?.parent ? l : null);
      loc = l && { ...l };
    },
    tail: () => tailOfBackings(childBackings, loc?.prev),
    addChild: (b: Backing): void => {
      if (loc?.parent)
        b.insert({ parent: loc.parent, prev: lastOf(childBackings) });
      childBackings.push(b);
    },
    name: "PortalDest"
  };
}

const destBackings: WeakMap<object, PortalDestBacking> = new WeakMap();

function destBackingFor(key: object): PortalDestBacking {
  return destBackings.get(key) ?? (destBackings.set(key, createPortalDestBacking()).get(key)!);
}

function createPortalSrcBacking(props: Portal.SrcProps): Backing {
  const { to, children: rawChildren } = props;
  const children = arrayify(rawChildren);

  let childBackings: Backing[] | null = null;
  let showing = false;
  let virtualLoc: BackingLocation = { parent: null, prev: null };
  let physicalLoc: BackingLocation = { parent: null, prev: null };

  function updateShow(): void {
    const toShow = !!(virtualLoc.parent && physicalLoc.parent);
    if (showing === toShow) return;
    showing = toShow;
    if (toShow && !childBackings)
      childBackings = children.map(c => assemble(c));
    insertBackings(childBackings, toShow ? physicalLoc : null);
  }
  
  const physicalBacking: Backing = {
    insert: l => {
      if (assignLocation(physicalLoc, l))
        updateShow();
    },
    tail: () => tailOfBackings(childBackings, physicalLoc?.prev),
    name: "PortalSrcPhys",
  };
  
  destBackingFor(to).addChild(physicalBacking);

  return {
    insert: (l) => {
      if (assignLocation(virtualLoc, l))
        updateShow();
    },
    tail: () => virtualLoc.prev?.tail() ?? null,
    name: "PortalSrcVirt",
  };
}

export const Portal = createSpecial((props: Portal.Props): Backing => {
  return ("to" in props) ? createPortalSrcBacking(props) : destBackingFor(props.from);
});
