import { observe } from "../../index-html.js";
import type { LocationLike, NavigateSource } from "./types.js";

export interface CreateHashNavigateSourceOptions {
  prefixBang?: string;
}

export function createHashNavigateSource(opts: CreateHashNavigateSourceOptions): NavigateSource {
  const prefix = opts.prefixBang ? "!" : "";
  const re = /^#!?\/(?<pathname>[^?#]*)(?<search>\?[^#]*)?(?<hash>#.*)$/;
  const [navLoc, setNavLoc] = observe<LocationLike>({
    pathname: "",
    search: "",
    hash: "",
    state: null,
  });

  window.addEventListener("popstate", ev => {
    // reinterpret query params without route in hash.
    // (e.g. https://test.example/?foo=bar => https://test.example/#/?foo=bar)
    if (location.search && /^(?:#!?\/?)?$/.test(location.hash)) {
      history.replaceState({}, "", `${location.origin}${location.pathname}#${prefix}/${location.search}`);
      return; // wait next popstate
    }

    const matchObj = location.hash.match(re);
    const p = matchObj && matchObj.groups as Partial<LocationLike>;
    if (!p)
      return;

    setNavLoc(v => {
      v.pathname = p.pathname || "";
      v.hash = p.hash || "";
      v.search = p.search || "";
      v.state = ev.state;
    });
  });

  return {
    location: () => navLoc,
    addState: (push: boolean, state: unknown, unused: string, url: string) => (
      (push ? history.pushState : history.replaceState)(
        state,
        unused,
        `${location.origin}${location.pathname}#${prefix}${url}`,
      )
    ),
    go: (delta?: number) => history.go(delta),
  };
}
