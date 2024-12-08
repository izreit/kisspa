import { signal, $ } from "kisspa";

export function TestComp() {
  const [count, setCount] = signal(3);
  return <button class={$`background:silver p:1rem`} onClick={() => setCount(count() + 1)}>
    { count }
  </button>;
}
