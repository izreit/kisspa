import assert from "node:assert";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultHandlers, SitekitHandlers } from "./context.js";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";

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
}

async function normalizeConfig(cfg: unknown, path: string, overrides: Config | null | undefined): Promise<ResolvedConfig> {
  const given = (cfg || {}) as Config;
  const { src, out } = { ...given, ...overrides };
  const { workspace, retainWorkspace } = { ...given.debugOptions, ...overrides?.debugOptions };
  const base = dirname(path);
  const ws = workspace ? resolve(base, workspace) : await mkdtemp(join(tmpdir(), "skws-"));
  return {
    src: resolve(base, src || ".."),
    out: resolve(base, out || "dist"),
    workspace: ws,
    theme: resolve(base, "theme"),
    userConfigPath: join(ws, "vite.config.mjs"),
    retainWorkspace: !!retainWorkspace,
  };
}

export interface LoadConfigOptions {
  configRoot: string;
  handlers: SitekitHandlers | null;
  workspace?: string;
}

export async function loadConfig(handlers: SitekitHandlers | null, path: string, overrides?: Config): Promise<ResolvedConfig> {
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
  return normalizeConfig(content, actualPath, overrides);
}

function asRequirePath(path: string): string {
  return `./${posix.relative(__dirname, path)}`;
}
