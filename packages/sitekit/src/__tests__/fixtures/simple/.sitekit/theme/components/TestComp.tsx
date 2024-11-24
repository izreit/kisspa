import { h, $, signal } from "kisspa/full";

export function TestComp() {
  const [count, setCount] = signal(3);
  return <div class={$`background:silver p:1rem`} onClick={() => setCount(count() + 1)}>
    { count }
  </div>;
}
