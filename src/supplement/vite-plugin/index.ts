import type { Plugin } from "vite";
import { nameCandidatesOf } from "../refresh/index.js";

export default function (): Plugin {
  return {
    name: "kisspa/hmr",
    transform(code, id, _options) {
      const m = id.match(/[/\\](?<name>[^/\\]+)\.[jt]sx$/);
      if (!m)
        return code;
      const nameCandidates = nameCandidatesOf(m.groups!.name);
      return code + (
        CODE_TEMPLATE
          .replace(/__FAMILY__/g, JSON.stringify(id))
          .replace(/__CANDIDATES__/g, JSON.stringify(nameCandidates))
          .replace(/__TARGET__/g, nameCandidates.map(cand =>
            `(typeof ${cand} === "function" && ${cand})`).join(" ?? ") + " ?? null"
          )
      );
    },
  };
}

// import type { Component } from "kisspa";
// declare const __FAMILY__: string;
// declare const __CANDIDATES__: string[];
// declare const __TARGET__: Component<unknown> & { special?: () => void };

const CODE_TEMPLATE = `
if (import.meta.hot) {
  const { getRefresher, setRefresher } = await import("kisspa");
  const { INTERFACE_VERSION: REFRESHER_IF_VER, createRefresher } = await import("kisspa/supplement/refresh");
  const refresher = getRefresher() || setRefresher(createRefresher());
  const family = __FAMILY__;
  const target = __TARGET__;

  const canRefresh = typeof target === "function" && typeof target.special === "undefined";
  if (canRefresh)
    refresher.register(target, family);

  import.meta.hot.accept((_newModule) => { // "import.meta.hot.accept(" must appear literally.
    const INTERFACE_VER = 1;
    if (INTERFACE_VER !== REFRESHER_IF_VER) {
      import.meta.hot.invalidate("plugin expects kisspa/supplement/refresh interface v" + INTERFACE_VER + " but found " + REFRESHER_IF_VER);
      return;
    }
    if (!target) {
      import.meta.hot.invalidate("No component found named " + JSON.stringify(__CANDIDATES__));
      return;
    }
    if (!canRefresh) {
      import.meta.hot.invalidate("Component " + family + " cannot be refreshed");
      return;
    }
  });
}`;
