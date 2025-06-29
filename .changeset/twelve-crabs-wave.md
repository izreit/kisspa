---
"kisspa": minor
---

BREAKING! [html] simplify backing lifecycle: now custom `Backing` (required to use `createSpecial()`) must have `mount()` instead of `insert()`. Unlike `insert()`, `mount()` is called just once with `BackingLocation`.
