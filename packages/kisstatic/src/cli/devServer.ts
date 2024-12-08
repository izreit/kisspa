import { watch } from "chokidar";
import pico from "picocolors";
import { createServer, type ViteDevServer } from "vite";
import { type DebugOptions } from "./config.js";
import { createSitekitContext, SitekitHandlers } from "./context.js";
import { createWeaver } from "./weaver.js";
import { createFloatingPromise } from "./util/promiseUtil.js";

const { dim } = pico;

export interface StartOptions {
  configRoot?: string;
  handlers?: SitekitHandlers | null;
  debugOptionsOverride?: DebugOptions;
}

export interface SitekitDevServer {
  readonly viteDevServer: ViteDevServer;
  restart(): Promise<void>;
  close(): Promise<void>;
}

export async function createSitekitDevServer(opts: StartOptions): Promise<SitekitDevServer> {
  const ctx = await createSitekitContext({
    handlers: opts.handlers,
    configRoot: opts.configRoot || ".",
    debugOptionsOverride: opts.debugOptionsOverride,
  });

  const weaver = await createWeaver(ctx);
  const { resolvedConfig } = ctx;
  const promiseSrcWatcherReady = createFloatingPromise<string>();

  const srcWatcher = watch(resolvedConfig.src, {
    ignored: (path, stats) => !!(stats?.isFile() && !/\.md$/.test(path)),
  });
  srcWatcher.on("ready", async () => {
    promiseSrcWatcherReady.resolveWith(await weaver.notifyReady());
  });
  srcWatcher.on("add", path => weaver.notifyAddDoc(path));
  srcWatcher.on("change", path => weaver.notifyChangeDoc(path));
  srcWatcher.on("unlink", path => weaver.notifyUnlinkDoc(path));

  const themeWatcher = watch(resolvedConfig.theme, {
    ignored: (path, stats) => !!(stats?.isFile() && !/\.html/.test(path)),
    ignoreInitial: true,
  });
  themeWatcher.on("add", path => weaver.notifyAddLayout(path));
  themeWatcher.on("change", path => weaver.notifyChangeLayout(path));
  themeWatcher.on("unlink", path => weaver.notifyUnlinkLayout(path));

  const viteRoot = await promiseSrcWatcherReady;

  let viteDevServer: ViteDevServer | undefined;
  try {
    viteDevServer = await createServer({
      root: viteRoot,
      customLogger: ctx.resolvedConfig.viteCustomLogger,
      envFile: false,
    });
    await viteDevServer.listen();
    ctx.logger.info(dim("vite server started\n"));
    viteDevServer.printUrls();
    viteDevServer.bindCLIShortcuts({ print: true });
  } catch (e) {
    await close();
    throw e;
  }

  async function close() {
    await viteDevServer?.close();
    await srcWatcher?.close();
    await themeWatcher?.close();
  }

  return {
    viteDevServer: viteDevServer!,
    restart: () => viteDevServer!.restart(),
    close,
  };
}
