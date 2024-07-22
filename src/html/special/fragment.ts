import { Backing, createSpecial } from "../core/backing";
import { PropChildren } from "../core/types";
import { ShowImpl } from "./show";

export namespace Fragment {
  export interface Props {
    children?: PropChildren;
  }
}

// To reduce file size, `<Fragment>...</Fragment>` is treated as just an `<Show when={() => true}>...</Show>`.
export const Fragment = createSpecial(({ children }: Fragment.Props): Backing => ShowImpl({ when: () => true, children }));
