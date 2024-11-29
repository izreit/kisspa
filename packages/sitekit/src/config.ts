import assert from "node:assert";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultHandlers, SitekitHandlers } from "./context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Config {
  /**
   * The relative path to the source directory.
   * Treated as "../" unless given.
   */
  src?: string;
  /**
   * The relative path to the output directory.
   * Treated as "./dist/" unless given.
   */
  out?: string;
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
}

function normalizeConfig(cfg: unknown, path: string): ResolvedConfig {
  const { src, out } = (cfg || {}) as Config;
  const base = dirname(path);
  const workspace = resolve(base, ".workspace");
  return {
    src: resolve(base, src ?? ".."),
    out: resolve(base, out ?? "dist"),
    workspace,
    theme: resolve(base, "theme"),
    userConfigPath: join(workspace, "vite.config.mjs"),
  };
}

export async function loadConfig(handlers: SitekitHandlers | null, p: string): Promise<ResolvedConfig> {
  const { isFile } = handlers || defaultHandlers;
  const filep = async (p: string) => (await isFile(p)) ? p : null;
  const actualPath = (
    await filep(join(p)) ??
    await filep(join(p, "sitekit.config.js")) ??
    await filep(join(p, "sitekit.config.mjs")) ??
    await filep(join(p, "sitekit.config.cjs"))
  );
  assert(actualPath, "sitekit.config.js not found.");
  const content = (await import(asRequirePath(actualPath))).default;
  return normalizeConfig(content, actualPath);
}

function asRequirePath(path: string): string {
  return `./${posix.relative(__dirname, path)}`;
}
