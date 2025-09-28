# decimated()

A small utility to decimate function calls.

Returns a microtask-coalesced function that batches multiple calls into a single run.

## Syntax

```ts
const d = decimated(fun);
await d();           // schedules; resolves after run
d.immediate();       // run now, synchronously
d.dispose();         // disable further runs
```

### Parameters

|Name|Type|Description|
|:---|:---|:---|
|`fun`|`() => void`|function to eventually execute.|

### Return value

A `DecimatedFun`, callable with control methods.

## Types

```ts
export interface DecimatedFun {
  (): Promise<void>;    // schedule a run on the next microtask
  immediate(): void;    // run synchronously now
  dispose(): void;      // disable future runs
}
```

## Description

`decimated()` ensures `fun` runs at most once per microtask, coalescing bursts of calls.

It caches and returns the same decimated wrapper for the same input `fun`.

## Examples

```ts
import { decimated } from "kisspa";

const save = decimated(() => doSave());

button.onclick = () => {
  save();
  save(); // `doSave()` will be called once even this is called twice.
};
```

## Related

- [requestFlush()](./request-flush.md)
