# presetColors

Tailwind-inspired color palettes for Upwind.
Plug them into `$.extend({ colors: … })` to unlock utility names like `background:sky-500`.

## Syntax

```ts
import { $ } from "kisspa";
import { presetColors } from "kisspa/extra/preset-colors";

$.extend({ colors: presetColors });
```

## Description

`presetColors` is a read-only map from palette names (`slate`, `sky`, `rose`, …) to tone tables (`50`, `100`, …, `950`).
Each tone is expressed as a hex color string.
The dataset mirrors Tailwind CSS v3.4.4 so you can reuse the familiar naming scheme inside Kisspa's Upwind utilities.

Attach the palettes via `$.extend({ colors: presetColors })` (or the equivalent `createUpwind().extend(...)`).
Once registered, declarations such as `color:neutral-50` or `background:emerald-500/60` resolve to the configured colors; the optional `/<alpha>` suffix converts a percentage into a hex alpha channel (e.g. `/60` → `99`).

To reduce default bundle size, `presetColors` is not provided from the root package exports.
Import it from the dedicated entrypoint `kisspa/extra/preset-colors` instead.

### Palettes included

`presetColors` contains the following palettes, each with tone steps `50, 100, …, 950`:

`slate`, `gray`, `zinc`, `neutral`, `stone`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`.

## Examples

### Enable the palettes for the default `$`

```ts
import { $, createUpwind } from "kisspa/upwind";
import { presetColors } from "kisspa/extra/preset-colors";

$.extend({ colors: presetColors });

$(
  "background:sky-500 color:neutral-50",
  ":hover/background:sky-600",
);
```

## Related

- [`$()`](./dollar.md)
- [`createUpwind()`](./create-upwind.md)
