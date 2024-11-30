import { watch } from "chokidar";
import { rmdirSync, rmSync } from "node:fs";
import { unlink } from "node:fs/promises";
import pico from "picocolors";
import { createServer, type UserConfig, type ViteDevServer, type Logger } from "vite";
import { type DebugOptions } from "./config.js";
import { createSitekitContext, SitekitHandlers } from "./context.js";
import { layoutNameOf, resolveLayout, weave } from "./weave.js";
import { createNestCountPromise, createFloatingPromise } from "./util/promiseUtil.js";

const { dim } = pico;

export interface StartOptions {
  configRoot?: string;
  handlers?: SitekitHandlers | null;
  debugOptionsOverride?: DebugOptions;
}

export interface Daemon {
  readonly viteDevServer: ViteDevServer;
  restart(): Promise<void>;
  close(): Promise<void>;
}

export async function start(opts: StartOptions): Promise<Daemon> {
  const ctx = await createSitekitContext({
    handlers: opts.handlers,
    configRoot: opts.configRoot || ".",
    debugOptionsOverride: opts.debugOptionsOverride,
  });
  const { resolvedConfig, handlers: { writeTextFile } } = ctx;

  const targets = createWatchedSet<string>(); // absolute paths
  const targetToPaths = new Map<string, string[]>();

  const promiseSrcWatcherReady = createFloatingPromise<void>();
  const promiseInitialAddCount = createNestCountPromise();
  let srcWatcherReady = false;

  async function handleAddDoc(path: string): Promise<void> {
    const woven = await weave(ctx, path);
    if (!woven) return;
    targets.add(woven.entryPath);
    targetToPaths.set(woven.entryPath, woven.paths);
  }
  const srcWatcher = watch(resolvedConfig.src, {
    ignored: (path, stats) => !!(stats?.isFile() && !/\.md$/.test(path)),
  });
  srcWatcher.on("ready", () => {
    srcWatcherReady = true;
    promiseSrcWatcherReady.resolveWith();
  });
  srcWatcher.on("add", path => {
    if (srcWatcherReady) {
      handleAddDoc(path);
    } else {
      promiseInitialAddCount.withCount(() => handleAddDoc(path));
    }
  });
  srcWatcher.on("change", async path => {
    await weave(ctx, path);
  });
  srcWatcher.on("unlink", async path => {
    const paths = targetToPaths.get(path)!;
    for (const path of paths)
      await unlink(path); // TODO use handler
    targets.delete(path);
    targetToPaths.delete(path);
  });

  const themeWatcher = watch(resolvedConfig.theme, {
    ignored: (path, stats) => !!(stats?.isFile() && !/\.html/.test(path)),
    ignoreInitial: true,
  });
  themeWatcher.on("add", async path => {
    await resolveLayout(ctx, layoutNameOf(ctx, path));
    // No need to flushStaled() since `path` is added just now: it must not have any reference.
  });
  themeWatcher.on("change", async path => {
    await resolveLayout(ctx, layoutNameOf(ctx, path));
    flushStaled();
  });
  themeWatcher.on("unlink", async path => {
    const name = layoutNameOf(ctx, path);
    const layout = ctx.layouts.get(name);
    if (!layout) return; // seems never happen but for safety.
    ctx.layouts.delete(name);
    if (layout.refs.size > 0)
      throw new Error(`Layout ${name} is removed though it's refered.`);
  });

  async function flushStaled() {
    const { done, value: path } = ctx.staled.values().next();
    if (done) return;
    await weave(ctx, path); // removes path from staled.
    setTimeout(flushStaled, 4);
  }

  if (!resolvedConfig.retainWorkspace) {
    process.on("exit", () => {
      // clear all written files (but not workspace itself, to ensure to not removing unrelated file)
      const { workspace, userConfigPath } = resolvedConfig;

      // must be the "sync" version because of the "exit" event.
      // See https://nodejs.org/api/process.html#event-exit
      rmSync(userConfigPath);

      targetToPaths.forEach((paths) => {
        paths.forEach(path => rmSync(path));
      });

      // delete workspace itself only if it's empty.
      try {
        rmdirSync(workspace);
      } catch (e) {
        if ((e as any)?.code !== "ENOTEMPTY")
          throw e;
      }
    });
  }

  let viteDevServer: ViteDevServer | undefined;

  async function close() {
    await viteDevServer?.close();
    await srcWatcher?.close();
    await themeWatcher?.close();
  }

  async function updateViteUserConfig(): Promise<void> {
    const userConfig = createViteUserConfig(targets);
    const content = `export default ${JSON.stringify(userConfig, null, 2)};`;
    await writeTextFile(resolvedConfig.userConfigPath, content);
  }

  await Promise.all([
    promiseSrcWatcherReady,
    promiseInitialAddCount,
  ]);

  updateViteUserConfig();
  targets.addWather(updateViteUserConfig);

  try {
    viteDevServer = await createServer({
      root: ctx.resolvedConfig.workspace,
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

  return {
    viteDevServer: viteDevServer!,
    restart: () => viteDevServer!.restart(),
    close,
  };
}

export function createViteUserConfig(targets: Set<string>): UserConfig {
  let count = 0;
  const input: NonNullable<NonNullable<UserConfig["build"]>["rollupOptions"]>["input"] = {};
  for (const target of targets.values())
    input[`i${count++}`] = target;

  return {
    build: {
      rollupOptions: {
        input,
      },
    },
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "kisspa",
    },
  };
}

interface WatchedSet<T> extends Set<T> {
  addWather(f: (set: WatchedSet<T>) => void): void;
  deleteWatcher(f: (set: WatchedSet<T>) => void): void;
}

function createWatchedSet<T>(): WatchedSet<T> {
  const ret = (new Set<T>()) as WatchedSet<T>;
  const watchers = new Set<(set: WatchedSet<T>) => void>();
  const { add: origAdd, delete: origDelete } = ret;

  ret.add = (v: T) => {
    const known = ret.has(v);
    origAdd.call(ret, v);
    if (!known)
      watchers.forEach(w => w(ret));
    return ret;
  };
  ret.delete = (v: T) => {
    const had = origDelete.call(ret, v);
    if (had)
      watchers.forEach(w => w(ret));
    return had;
  };
  ret.addWather = (f: (set: WatchedSet<T>) => void): void => {
    watchers.add(f);
  };
  ret.deleteWatcher = (f: (set: WatchedSet<T>) => void): void => {
    watchers.delete(f);
  };
  return ret;
}
