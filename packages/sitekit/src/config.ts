import { stat } from "fs/promises";
import assert from "node:assert";
import { join, posix, resolve } from "node:path";

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
   * The *absolute* path to the source directory.
   */
  src: string;
  /**
   * The *absolute* path to the output directory.
   */
  out: string;
}

function normalizeConfig(cfg: unknown, path: string): ResolvedConfig {
  const { src, out } = (cfg || {}) as Config;
  return {
    src: resolve(path, src ?? ".."),
    out: resolve(out ?? "./dist/"),
  };
}

async function loadConfig(p: string): Promise<ResolvedConfig> {
  const filep = async (p: string) => (await stat(p)).isFile() ? p : null;
  const actualPath = (
    await filep(join(p)) ??
    await filep(join(p, "sitekit.config.js")) ??
    await filep(join(p, "sitekit.config.mjs")) ??
    await filep(join(p, "sitekit.config.cjs"))
  );
  assert(actualPath, "sitekit.config.js not found.");
  return normalizeConfig(require(asRequirePath(actualPath)), actualPath);
}

function asRequirePath(path: string): string {
  return `./${posix.relative(".", path)}`;
}
