import { AssembleContext, Backing, createSpecial } from "../core/backing";
import type { PropChildren } from "../core/types";
import { PortalImpl } from "./portal";

export namespace Head {
  export type Props = {
    children?: PropChildren;
  };
}

/**
 * Alias of `<Portal to={document.head} />`.
 *
 * The children of this component will be inserted to `document.head`.
 * You don't need to place <Portal from={} /> explicitly.
 *
 * Any elements allowed under HTMLHeadElement are valid but <title /> is not
 * recommended because "there must be no more than one title element per document,"
 * according to the [spec]. Use `document.title = ...` instead (e.g. in `onMout()`
 * and `onCleanup()`). For the same reason, <base /> is also not recommended
 * when the document already contains it.
 *
 * [spec]: https://html.spec.whatwg.org/multipage/semantics.html#the-title-element
 */
export const Head = createSpecial((actx: AssembleContext, props: Head.Props): Backing => (
  PortalImpl(actx, { ...props, to: document.head })
));
