import { Backing, BackingLocation, assemble, assignLocation, createSpecial, disposeBackings, insertBackings, tailOfBackings } from "../core/backing";
import { Component, PropChildren } from "../core/types";
import { mapCoerce } from "../core/util";

export interface ContextProviderProps<T> {
  value: T;
  children?: PropChildren;
}

export type ContextPair<T> = {
  Provider: Component<ContextProviderProps<T>, ContextProviderProps<T>["children"]>;
  useContext: () => T;
};

export function createContext<T>(initial: T): ContextPair<T> {
  const stack: T[] = [initial];

  const Provider = createSpecial<ContextProviderProps<T>>(function Provider(props: ContextProviderProps<T>): Backing {
    let bs: Backing[];
    try {
      stack.push(props.value);
      bs = mapCoerce(props.children, c => assemble(c));
    } finally {
      stack.pop();
    }

    let loc: BackingLocation = { parent: null, prev: null };
    return {
      insert: (l) => {
        if (assignLocation(loc, l))
          insertBackings(bs, loc);
      },
      tail: () => tailOfBackings(bs, loc?.prev),
      dispose: () => disposeBackings(bs),
      name: "Ctx"
    };
  });

  function useContext(): T {
    return stack[stack.length - 1]!;
  }

  return { Provider, useContext };
}
