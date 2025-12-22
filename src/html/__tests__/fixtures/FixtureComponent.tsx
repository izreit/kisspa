// biome-ignore lint/correctness/noUnusedImports: needed for JSX
import { h } from "../../h.js"
import type { JSX } from "../../index.js";

export function FixtureComponent(props: { value: () => number }): JSX.Element {
  return <div>{ props.value }</div>;
}
