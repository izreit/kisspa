import { type JSX, h } from "../../index";

export function FixtureComponent(props: { value: () => number }): JSX.Element {
  return <div>{ props.value }</div>;
}
