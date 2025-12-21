# unwrap()

Returns the raw underlying object from a store.

## Syntax

```ts
const raw = unwrap(value);
```

## Parameters

|Name|Type|Description|
|:---|:---|:---|
|`value`|`object`|store, read proxy returned from `createStore()`.|

## Return value

An `object`, the original object if proxied; otherwise the input value.

## Related

- [`createStore()`](./create-store.md)
