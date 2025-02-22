import type { JSX } from "../../index.js";
import { h } from "../../h.js"

export function FixtureComponent(props: { value: () => number }): JSX.Element {
  return <div>{ props.value }</div>;
}
