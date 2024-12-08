
import { relative } from "node:path";
import { preview as vitePreview } from "vite";
import { type DebugOptions } from "./config.js";
import { createSitekitContext, type SitekitHandlers } from "./context.js";

export interface PreviewOptions {
  configRoot?: string;
  handlers?: SitekitHandlers | null;
  debugOptionsOverride?: DebugOptions;
}

export async function preview(opts: PreviewOptions): Promise<void> {
  const ctx = await createSitekitContext({
    handlers: opts.handlers,
    configRoot: opts.configRoot || ".",
    debugOptionsOverride: opts.debugOptionsOverride,
  });

  const vitePreviewServer = await vitePreview({
    configFile: false,
    root: ctx.resolvedConfig.workspace,
    customLogger: ctx.resolvedConfig.viteCustomLogger,
    envFile: false,
    build: {
      outDir: relative(ctx.resolvedConfig.workspace, ctx.resolvedConfig.out),
    },
  });

  vitePreviewServer.printUrls();
  vitePreviewServer.bindCLIShortcuts({ print: true });
}
