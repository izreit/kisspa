import { createTag } from "./tag";

const mediaStr = (s: string) => `@media ${s} { <whole> }`;
const minWidthStr = (n: number) => mediaStr(`(min-width: ${n}px)`);

export const defaultModifiers = {
  sm: minWidthStr(640),
  md: minWidthStr(768),
  lg: minWidthStr(1024),
  xl: minWidthStr(1280),
  "2xl": minWidthStr(1536),
};

export const defaultProperties = {
  "m<trbl>": "margin<trbl>",
  "p<trbl>": "padding<trbl>",
  "b<trbl>": "border<trbl>",
  "w": "width",
  "h": "height",
  "bg": "background",
  "d": "display",
};

export const $ = createTag();
$.extend({
  modifiers: defaultModifiers,
  properties: defaultProperties,
});
