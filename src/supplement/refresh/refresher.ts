import type { Backing, Component, Refresher } from "../../html/core/types.js";

export interface Objectized<T> {
  val: T;
}

export function createObjectize<T>(): (val: T) => Objectized<T> {
  const table: Map<T, Objectized<T>> = new Map();

  return function objectize(val: T): Objectized<T> {
    let ret = table.get(val);
    if (!ret) {
      ret = { val };
      table.set(val, ret);
    }
    return ret;
  };
}

const objectize = createObjectize<string>();

export function createRefresher(): Refresher {
  const compToFamilyTable: WeakMap<Component<any>, Objectized<string>> = new WeakMap();
  const familyToCurrentTable: WeakMap<Objectized<string>, Component<any>> = new WeakMap();
  const familyToInstancesTable: WeakMap<Objectized<string>, { backing: ProxyBacking, refresh: (c: Component<any>) => Backing }[]> = new WeakMap();

  return {
    register(c: Component<any>, family: string): void {
      const fam = objectize(family);
      compToFamilyTable.set(c, fam);
      familyToCurrentTable.set(fam, c);

      const instances = familyToInstancesTable.get(fam) ?? [];
      familyToInstancesTable.set(fam, instances.filter(({ backing, refresh }) => {
        const alive = !backing.isDisposed();
        if (alive)
          backing.replaceTarget(refresh(c));
        return alive;
      }));
    },

    resolve<T>(c: Component<T>): Component<T> {
      const fam = compToFamilyTable.get(c);
      return (fam && familyToCurrentTable.get(fam)) ?? c;
    },

    track<T>(c: Component<T>, backing: Backing, refresh: (c: Component<T>) => Backing): Backing {
      const fam = compToFamilyTable.get(c);
      if (!fam || !familyToInstancesTable.has(fam)) {
        // not registered. never reach?
        return backing;
      }

      const ret = createProxyBacking(backing);
      const instances = familyToInstancesTable.get(fam)!;
      instances.push({ backing: ret, refresh });
      return ret;
    }
  };
}

export interface ProxyBacking extends Backing {
  isDisposed(): boolean;
  getTarget(): Backing;
  replaceTarget(b: Backing): void;
}

function createProxyBacking(b: Backing): ProxyBacking {
  let proxied = b;
  return {
    mount: loc => {
      proxied.mount(loc);
    },
    tail: () => proxied.tail(),
    dispose: () => {
      if (!proxied) return;
      proxied.dispose();
      proxied = null!;
    },
    name: "Proxy",
    isDisposed: () => !proxied,
    getTarget: () => proxied,
    replaceTarget: b => {
      if (!proxied) return;
      const rloc = proxied.tail();
      if (rloc?.[0])
        b.mount({ parent: rloc[0], prev: rloc[1] });
      proxied.dispose();
      proxied = b;
    },
  };
}
