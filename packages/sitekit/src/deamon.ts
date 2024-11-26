import { unlink } from "node:fs/promises";
import { sep } from "node:path";
import { watch } from "chokidar";
import { createServer, type UserConfig, type ViteDevServer } from "vite";
import { createSitekitContext, SitekitHandlers } from "./context";
import { layoutNameOf, resolveLayout, weave } from "./weave";

export interface StartOptions {
  handlers?: SitekitHandlers | null;
  configRoot?: string;
}

export interface Daemon {
  readonly viteDevServer: ViteDevServer;
  restart(): Promise<void>;
  close(): Promise<void>;
}

export async function start(opts: StartOptions): Promise<Daemon> {
  const moduleDirName = `${sep}node_modules${sep}`;
  const ctx = await createSitekitContext(opts.handlers, opts.configRoot || ".");
  const { resolvedConfig, handlers: { writeTextFile } } = ctx;

  const targets = createWatchedSet<string>(); // absolute paths
  const targetToPaths = new Map<string, string[]>();

  targets.addWather(async s => {
    const userConfig = createViteUserConfig(s);
    const content = `export default ${JSON.stringify(userConfig, null, 2)};`;
    await writeTextFile(resolvedConfig.userConfigPath, content);
  });

  const srcWatcher = watch(resolvedConfig.src, {
    ignored: (path, stats) => !(!path.includes(moduleDirName) && stats?.isFile() && /\.md$/.test(path)),
  });
  srcWatcher.on("add", async path => {
    const woven = await weave(ctx, path);
    if (!woven) return;
    targets.add(woven.entryPath);
    targetToPaths.set(woven.entryPath, woven.paths);
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
    ignored: (path, stats) => !(stats?.isFile() && /\.html/.test(path)),
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

  let viteDevServer: ViteDevServer | undefined;
  async function close() {
    await viteDevServer?.close();
    await srcWatcher?.close();
    await themeWatcher?.close();
  }

  try {
    viteDevServer = await createServer({
      root: ctx.resolvedConfig.workspace,
      envFile: false,
    });
    await viteDevServer.listen();
    viteDevServer.printUrls();
    viteDevServer.bindCLIShortcuts();
  } catch (e) {
    await close();
    throw e;
  }

  return {
    viteDevServer,
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
        input
      }
    }
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
