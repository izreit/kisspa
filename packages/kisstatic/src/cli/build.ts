import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import pico from "picocolors";
import { build as viteBuild } from "vite";
import { type DebugOptions } from "./config.js";
import { createKisstaticContext, type KisstaticHandlers } from "./context.js";
import { createWeaver } from "./weaver.js";

const { dim, green } = pico;

export interface BuildOptions {
  configRoot?: string;
  handlers?: KisstaticHandlers | null;
  debugOptionsOverride?: DebugOptions;
}

export async function build(opts: BuildOptions): Promise<void> {
  const ctx = await createKisstaticContext({
    handlers: opts.handlers,
    configRoot: opts.configRoot || ".",
    debugOptionsOverride: opts.debugOptionsOverride,
  });

  const weaver = await createWeaver(ctx);
  const { resolvedConfig } = ctx;

  const dirents = await readdir(resolvedConfig.src, { withFileTypes: true, recursive: true });
  for (const dirent of dirents) {
    if (!dirent.isFile() || extname(dirent.name) !== ".md")
      continue;

    const path = join(dirent.parentPath, dirent.name);
    ctx.logger.info(`${green("build")} ${dim(path)}`);
    weaver.notifyAddDoc(path);
  }

  const viteRoot = await weaver.notifyReady();
  await viteBuild({
    root: viteRoot,
    customLogger: ctx.resolvedConfig.viteCustomLogger,
    envFile: false,
  });
}
