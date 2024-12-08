import type { PageProps } from "../cli/weave.js";

declare global {
  const __sitekit_page_props__: PageProps;
}

export function usePageProps(): PageProps {
  if (typeof __sitekit_page_props__ === "undefined")
    throw new Error("usePageProps(): This function can be called from sitekit components only.");

  return __sitekit_page_props__;
}
