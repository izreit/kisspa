# kisspa

## 0.6.2

### Patch Changes

- 5b9d8b5: [html] fix no `Fragment` in kisspa/jsx-runtime

## 0.6.1

### Patch Changes

- dad940c: [html] make `kisspa/jsx-runtime` and `kisspa/jsx-dev-runtime` independent entry points

## 0.6.0

### Minor Changes

- f0c5de6: [BREAKING] drop CommonJS support

## 0.5.0

### Minor Changes

- b54646c: BREAKING [upwind] add unit `n` instead of unit-less number.

### Patch Changes

- 3ab0eb9: [upwind] fix ignored multiple modifiers in key of object-style

## 0.4.0

### Minor Changes

- 0d5b62c: BREAKING [upwind] rename createTag() to createUpwind(). make $ a function but not a tagged template literal.

## 0.3.0

### Minor Changes

- d985640: accept non-function for `each` prop of <For/>
- 21dda91: Introduce `capture` prop for Show/Match, which reject not only false but also nullish, instead of `guareded`

### Patch Changes

- 7152d64: [upwind] fix ignored unit-less negative number

## 0.2.1

### Patch Changes

- 38261be: use .special property for SpecialComponent
- da1e178: fix: importing from ESM was typed wrong

## 0.2.0

### Minor Changes

- af68b34: add Prop<T> and deprop()
