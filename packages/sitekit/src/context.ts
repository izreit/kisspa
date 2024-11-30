import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { type DebugOptions, loadConfig, type ResolvedConfig } from "./config.js";
import { type LayoutFragment } from "./parseLayout.js";

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

export interface CreateSitekitOptions {
  configRoot: string;
  handlers?: SitekitHandlers | null;
  debugOptionsOverride?: DebugOptions;
}

export async function createSitekitContext(opts: CreateSitekitOptions): Promise<SitekitContext> {
  const { configRoot, handlers, debugOptionsOverride } = opts;
  const h = handlers || defaultHandlers;
  const absConfigRoot = resolve(configRoot);
  return {
    configRoot: absConfigRoot,
    resolvedConfig: await loadConfig(h, absConfigRoot, debugOptionsOverride),
    layouts: new Map(),
    staled: new Set(),
    handlers: h,
  };
}
