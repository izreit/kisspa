import type { JSXNode } from "../../index-html.js";
import type { AsRelative, RouteParameters } from "./internal/typeutil.js";

export interface LocationLike {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
}

export interface NavigateSource {
  location(): LocationLike;
  addState(push: boolean, state: unknown, unused: string, url?: string): void;
  go(delta?: number): void;
}

export type Navigate<Path extends string, Paths extends string> = {
  <P extends Paths | AsRelative<Path, Paths>>(dest: P, params: RouteParameters<P>): void;
  (dest: number): void;
};

export type RouteComponentProps<Path extends string, Paths extends string> = {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;

  path: Path;
  params: RouteParameters<Path>;
  navigate: Navigate<Path, Paths>;
};

export type RouteTableEntry<Path extends string, Paths extends string> =
  (props: RouteComponentProps<Path, Paths>) => JSXNode;

export type RouteTable<Paths extends string> = {
  [P in Paths]: RouteTableEntry<P, Paths>;
}
