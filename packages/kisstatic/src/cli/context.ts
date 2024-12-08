import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { type DebugOptions, loadConfig, type ResolvedConfig } from "./config.js";
import { createKisstaticLogger, type KisstaticLogger } from "./logger.js";
import { type LayoutFragment } from "./parseLayout.js";
import pico from "picocolors";

const { dim } = pico;

export interface KisstaticHandlers {
  readTextFile: (path: string) => Promise<string>;
  writeTextFile: (path: string, content: string) => Promise<void>;
  isFile: (path: string) => Promise<boolean>;
}

export const defaultHandlers: KisstaticHandlers = {
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

export interface KisstaticContext {
  /**
   * The absolute path of the .kisstatic/ dir.
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

  /**
   * The logger, only for kisstatic (not used by Vite).
   */
  logger: KisstaticLogger;

  handlers: KisstaticHandlers;
}

export interface CreateKisstaticOptions {
  configRoot: string;
  handlers?: KisstaticHandlers | null;
  loggerOverride?: KisstaticLogger;
  debugOptionsOverride?: DebugOptions;
}

export async function createKisstaticContext(opts: CreateKisstaticOptions): Promise<KisstaticContext> {
  const { configRoot, handlers, loggerOverride, debugOptionsOverride } = opts;
  const h = handlers || defaultHandlers;
  const absConfigRoot = resolve(configRoot);
  const config = await loadConfig(h, absConfigRoot, debugOptionsOverride);
  const logger = loggerOverride || config.customLogger || createKisstaticLogger(config.logLevel);
  logger.debug(`config ${dim(JSON.stringify(config, null, 2))}`);
  return {
    configRoot: absConfigRoot,
    resolvedConfig: config,
    layouts: new Map(),
    staled: new Set(),
    logger,
    handlers: h,
  };
}
