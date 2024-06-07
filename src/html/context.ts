import { Backing, assemble, createSpecial, insertBackings, tailOfBackings } from "./backing";
import { Component, JSXNode } from "./types";
import { arrayify } from "./util";

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

    let loc: Backing.InsertLocation | null = null;
    return {
      insert: (l: Backing.InsertLocation) => {
        loc = { ...l };
        insertBackings(bs, loc);
      },
      tail: () => tailOfBackings(bs, loc?.prev),
      name: "Ctx"
    };
  });

  function use(): T {
    return stack[stack.length - 1]!;
  }

  return [Provider, use];
}
