import assert from "node:assert";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultHandlers, SitekitHandlers } from "./context.js";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { SitekitLogger, type LogLevel } from "./logger.js";
import { Logger } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface DebugOptions {
  /**
   * The relative path to the workspace directory.
   * Treated as a temporary unless given.
   */
  workspace?: string;
  /**
   * Disable clearing the workspace directory on exit.
   * `false` by default.
   */
  retainWorkspace?: boolean;
}

export interface Config {
  /**
   * The relative path (from config file) to the source directory.
   * Treated as "../" unless given.
   */
  src?: string;

  /**
   * The relative path to the output directory.
   * Treated as "./dist/" unless given.
   */
  out?: string;

  /**
   * Threshold to print log.
   * Must be `("error" | "warn" | "info")`.
   * Treated as `"info"` unless given.
   */
  logLevel?: LogLevel;

  /**
   * Custom logger for sitkit log.
   * If given, `logLevel` is ignored.
   */
  customLogger?: SitekitLogger;

  /**
   * Custom logger for vite output.
   */
  viteCustomLogger?: Logger;

  /**
   * Debug options. No need to use in general.
   */
  debugOptions?: DebugOptions;
}

export interface ResolvedConfig {
  /**
   * The *absolute* path of the source directory.
   */
  src: string;

  /**
   * The *absolute* path of the output directory.
   */
  out: string;

  /**
   * The *absolute* path of the workspace directory.
   */
  workspace: string;

  /**
   * The *absolute* path of the theme directory.
   */
  theme: string;

  /**
   * The *absolute* path of vite.config.mjs we generate.
   */
  userConfigPath: string;

  /**
   * If true, don't clear the workspace on exit.
   */
  retainWorkspace: boolean;

  /**
   * Threshold to print log.
   * Must be `("error" | "warn" | "info")`.
   * Treated as `"info"` unless given.
   */
  logLevel: LogLevel;

  /**
   * Custom logger for sitkit log.
   * If given, `logLevel` is ignored.
   */
  customLogger: SitekitLogger | undefined;

  /**
   * Custom logger for vite output.
   */
  viteCustomLogger: Logger | undefined;

}

async function normalizeConfig(cfg: unknown, path: string, debugOptionsOverride: DebugOptions | null | undefined): Promise<ResolvedConfig> {
  const base = dirname(path);
  const given = (cfg || {}) as Config;
  const { src, out } = given;
  const { workspace: givenWorkspace, retainWorkspace: givenRetainWorkspace } = given.debugOptions || {};

  const workspace =
    debugOptionsOverride?.workspace ||
    (givenWorkspace ?
      resolve(base, givenWorkspace) :
      await mkdtemp(join(tmpdir(), "skws-")));
  const retainWorkspace = !!(debugOptionsOverride?.retainWorkspace || givenRetainWorkspace);

  return {
    src: resolve(base, src || ".."),
    out: resolve(base, out || "dist"),
    workspace,
    theme: resolve(base, "theme"),
    userConfigPath: join(workspace, "vite.config.mjs"),
    retainWorkspace,
    logLevel: given.logLevel || "info",
    customLogger: given.customLogger,
    viteCustomLogger: given.viteCustomLogger,
  };
}

export interface LoadConfigOptions {
  configRoot: string;
  handlers: SitekitHandlers | null;
  workspace?: string;
}

export async function loadConfig(handlers: SitekitHandlers | null, path: string, debugOptionsOverride?: DebugOptions): Promise<ResolvedConfig> {
  const { isFile } = handlers || defaultHandlers;
  const filep = async (p: string) => (await isFile(p)) ? p : null;
  const actualPath = (
    await filep(join(path)) ??
    await filep(join(path, "sitekit.config.js")) ??
    await filep(join(path, "sitekit.config.mjs")) ??
    await filep(join(path, "sitekit.config.cjs"))
  );
  assert(actualPath, "sitekit.config.js not found.");
  const content = (await import(asRequirePath(actualPath))).default;
  return normalizeConfig(content, actualPath, debugOptionsOverride);
}

function asRequirePath(path: string): string {
  return `./${posix.relative(__dirname, path)}`;
}
