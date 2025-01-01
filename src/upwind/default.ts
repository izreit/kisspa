import { createTag } from "./tag";

const minWidthStr = (n: number) => `@media (min-width: ${n}px)`;

export const defaultConditions = {
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
  "<max-|min-|>w": "<>width",
  "<max-|min-|>h": "<>height",
  bg: "background",
  d: "display",
};

export const $ = createTag();
$.extend({
  modifiers: {
    conditions: defaultConditions,
  },
  properties: defaultProperties,
});
