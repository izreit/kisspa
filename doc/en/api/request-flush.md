# requestFlush()

Schedules a flush of pending reactive updates.
Coalesces multiple requests into a microtask.

## Syntax

```ts
await requestFlush();
```

## Parameters

None.

## Return value

A `Promise<void>` resolved when the flush is complete.

## Description

Internally used by the reactive system to trigger observer re-execution after writes.
Exposed for advanced control and testing.

`requestFlush.immediate()` is also provided to flush synchronously.

## Examples

```ts
import { requestFlush } from "kisspa";

// Force synchronous flush in tests
requestFlush.immediate();
```

## Related

- [`createEffect()`](./create-effect.md)
- [`createStore()`](./create-store.md)

