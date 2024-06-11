import { Backing, BackingLocation, assemble, assignLocation, createSpecial, disposeBackings, insertBackings, tailOfBackings } from "../core/backing";
import { Component, JSXNode } from "../core/types";
import { arrayify } from "../core/util";

export interface ContextProviderProps<T> {
  value: T;
  children?: JSXNode | JSXNode[] | null;
}

export type ContextPair<T> = [
  Component<ContextProviderProps<T>, ContextProviderProps<T>["children"]>,
  () => T
];

export function createContext<T>(initial: T): ContextPair<T> {
  const stack: T[] = [initial];

  const Provider = createSpecial<ContextProviderProps<T>>(function Provider(props: ContextProviderProps<T>): Backing {
    let bs: Backing[];
    try {
      stack.push(props.value);
      bs = arrayify(props.children)?.map(c => assemble(c)) ?? [];
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

  function use(): T {
    return stack[stack.length - 1]!;
  }

  return [Provider, use];
}
