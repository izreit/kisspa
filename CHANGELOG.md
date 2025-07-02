# kisspa

## 0.14.0

### Minor Changes

- 464e276: BREAKING! [html] unallow `attach()` and `createRoot()` without parent
- c8839e1: BREAKING! [html] remove wrongly exposed `createBackingCommon()`
- 2c92646: BREAKING! [html] simplify backing lifecycle: now custom `Backing` (required to use `createSpecial()`) must have `mount()` instead of `insert()`. Unlike `insert()`, `mount()` is called just once with `BackingLocation`.

### Patch Changes

- 464e276: [html] fix: skip `onCleanup()` handlers of async components when disposed before `onMount()`
- ddc24a4: [html] fix: error in HMR on components using `onMount()`, `onCleanup()` or `useContext()`

## 0.13.0

### Minor Changes

- f6f26ce: [html] feat: add global `onMount()` and `onCleanup()` (but not properties of `useComponentMethods()`)
- ec63b23: [html] feat: add `useContext()`
- f6f26ce: BREAKING! [html] remove unused `useComponentMethods().reaction()` (use `onCleanup(autorun(fun))` instead)
- ec63b23: BREAKING! [html] remove `withContext()` unhandy to HMR (use `useContext()` instead)

## 0.12.2

### Patch Changes

- 2ff30f1: [html] fix: `<Suspense/>` renders the fallback as many times as there are Promises in JSX
- 2ff30f1: [html] fix: `<Suspense/>` ovrelooks `Promise` in descendants of context providers

## 0.12.1

### Patch Changes

- e09719d: [html] fix: reset `ref` when detach

## 0.12.0

### Minor Changes

- b934526: [html] make `withContext()` accept multiple contexts as array

## 0.11.1

### Patch Changes

- 271d182: [html] make `ref` in JSX contravariant

## 0.11.0

### Minor Changes

- 49d0de8: BREAKING! [reactive] remove `StoreSetter#autorun()` which is untested and never used

## 0.10.1

### Patch Changes

- b5a6b59: [html] fix crash by a prop accepting both string and other types
- 3e72036: [html] fix: allow `undefined` in JSX

## 0.10.0

### Minor Changes

- 991865a: [html] accept array including `EventListnerOptions` for event listener attributes like `onClick`

### Patch Changes

- 0c6537a: [html] fix non-reflecting attribute (like checked, selected) isn't dynamic
- 991865a: [html] remove unimplemented "Capture" attributes like `onClickCapture` or `onKeyUpCapture`

## 0.9.1

### Patch Changes

- 418e465: [supplement] fix HMR that breaks DOM order

## 0.9.0

### Minor Changes

- 0454627: [supplement] add supplement/refresher and supplement/vite-plugin
- 0454627: [html] add internal methods `getRefresher()`, `setRefresher()` for HMR

## 0.8.1

### Patch Changes

- 6eaabf8: add exports /raw/h, /raw/extra/
- af76d52: [html] fix crash when a component receives various length children

## 0.8.0

### Minor Changes

- 38e6dc0: [upwind] allow functions as arguments of $()

## 0.7.0

### Minor Changes

- 2614ee1: BREAKING [html] move `h` and `Fragment` to the independent entry point `kisspa/h`

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
