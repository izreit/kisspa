import type { FragmentComponent } from "./backing";
import type { JSXElement, JSXNode, PropChildren } from "./types";

/**
 * Fragment (`<></>`).
 *
 * A special component defined directy (but not through createSpecial() like other specials)
 * because this file is imported separately through jsx-runtime.
 *
 * As a special component, this function itself is just a marker, never called.
 * Just return 0 to be minimal. (cf. createSpecial())
 */
export const Fragment = (_props: { children?: JSXNode | JSXNode[]; }): JSXElement => (0 as any)!;

// Make it special.
// The empty string "" for .special is also just a marker to avoid duplication (in the library root and jsx-runtime).
// Unlike other special componenets, the actual implementation for `<></>` is integrated in assembleImpl().
(Fragment as FragmentComponent).special = "";
