import { autorun, observe } from "../../index-html.js";
import type { LocationLike, NavigateSource } from "./types.js";

export function createMemoryNavigateSource(): NavigateSource {
  const nullNavLoc = Object.freeze({
    pathname: "",
    search: "",
    hash: "",
    state: null,
  });

  interface NavLocStore {
    navLoc: LocationLike;
    index: number;
    history: LocationLike[];
  }

  const [navLocStore, setNavLocStore] = observe<NavLocStore>({
    navLoc: nullNavLoc,
    index: 0,
    history: [nullNavLoc],
  });

  autorun(() => {
    setNavLocStore(s => {
      s.navLoc = navLocStore.history[navLocStore.index];
    });
  });

  return {
    location: () => navLocStore.navLoc,
    addState: (push: boolean, state: unknown, _unused: string, url: string) => {
      const re = /^\/(?<pathname>[^?#]*)(?<search>\?[^#]*)?(?<hash>#.*)?$/;
      const matchObj = url.match(re);
      const p = matchObj && matchObj.groups as Partial<LocationLike>;
      if (!p)
        return;

      const entry = {
        pathname: p.pathname || "",
        search: p.search || "",
        hash: p.hash || "",
        state,
      };

      setNavLocStore(s => {
        s.history.length = s.index + 1;
        if (push) {
          s.history.push(entry);
          s.index++;
        } else {
          s.history[s.history.length - 1] = entry;
        }
      });
    },

    go: (delta = 0) => {
      setNavLocStore(s => {
        s.index += delta;
      });
    }
  };
}
