import type { PageProps } from "../cli/weave.js";

declare global {
  const __kisstatic_page_props__: PageProps;
}

export function usePageProps(): PageProps {
  if (typeof __kisstatic_page_props__ === "undefined")
    throw new Error("usePageProps(): This function can be called from kisstatic components only.");

  return __kisstatic_page_props__;
}
