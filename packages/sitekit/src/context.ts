import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { loadConfig, ResolvedConfig } from "./config";
import { LayoutFragment } from "./parseLayout";

export interface SitekitHandlers {
  readTextFile: (path: string) => Promise<string>;
  writeTextFile: (path: string, content: string) => Promise<void>;
  isFile: (path: string) => Promise<boolean>;
}

export const defaultHandlers: SitekitHandlers = {
  readTextFile: p => readFile(p, "utf-8"),

  writeTextFile: async (p, content) => {
    await mkdir(dirname(p), { recursive: true });
    return writeFile(p, content, "utf-8");
  },

  isFile: p => stat(p).then(st => st.isFile(), () => false),
};

export interface Layout {
  /**
   * the absolute path
   */
  dir: string;
  hash: string;
  refs: Set<string>;
  fragments: LayoutFragment[];
}

export interface SitekitContext {
  /**
   * The absolute path of the .sitekit/ dir.
   */
  configRoot: string;

  /**
   * Config.
   */
  resolvedConfig: ResolvedConfig;

  /**
   * The layout cache table.
   */
  layouts: Map<string, Layout>;

  /**
   * The relative paths (from configRoot) of docs (.md) refering changed layouts.
   */
  staled: Set<string>;

  handlers: SitekitHandlers;
}

export async function createSitekitContext(handlers: SitekitHandlers | null | undefined, configRoot: string): Promise<SitekitContext> {
  const h = handlers || defaultHandlers;
  const absConfigRoot = resolve(configRoot);
  return {
    configRoot: absConfigRoot,
    resolvedConfig: await loadConfig(h, absConfigRoot),
    layouts: new Map(),
    staled: new Set(),
    handlers: h,
  };
}
