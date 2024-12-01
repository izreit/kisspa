import { rmdirSync, rmSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { type UserConfig } from "vite";
import { SitekitContext } from "./context.js";
import { layoutNameOf, resolveLayout, weave } from "./weave.js";
import { relative } from "node:path";
import pico from "picocolors";

const { dim, green } = pico;

export interface Weaver {
  /**
   * Notify a document file (.md) is added.
   * The file will be weaven.
   * @param path doc file (.md) path relative to the `src` directory.
   */
  notifyAddDoc(path: string): Promise<void>;

  /**
   * Notify a document file (.md) is changed.
   * @param path doc file (.md) path relative to the `src` directory.
   */
  notifyChangeDoc(path: string): Promise<void>;

  /**
   * Notify a document file (.md) is unlinked.
   * @param path doc file (.md) path relative to the `src` directory.
   */
  notifyUnlinkDoc(path: string): Promise<void>;

  /**
   * Notify a layout file (.html) is added.
   * @param path layout file (.html) path relative to the theme root.
   */
  notifyAddLayout(path: string): Promise<void>;

  /**
   * Notify a layout file (.html) is changed.
   * @param path layout file (.html) path relative to the theme root.
   */
  notifyChangeLayout(path: string): Promise<void>;

  /**
   * Notify a layout file (.html) is unlinked.
   * @param path layout file (.html) path relative to the theme root.
   */
  notifyUnlinkLayout(path: string): Promise<void>;

  /**
   * Notify ready to build.
   *
   * When called, waits all doc file (given by notifyAddDoc()) is processed and
   * then writes vite.config.js to `SitekitContext#resolvedConfig.userConfigPath`.
   * After called, vite.config.js will be rewritten as notifyAddDoc() or notifyUnlinkDoc() called.
   *
   * @returns path of the directory containing the written vite.config.js
   */
  notifyReady(): Promise<string>;
}

export async function createWeaver(ctx: SitekitContext): Promise<Weaver> {
  const { resolvedConfig, handlers: { writeTextFile } } = ctx;

  const targets = createWatchedSet<string>(); // absolute paths
  const targetToPaths = new Map<string, string[]>();
  let promisesAddDoc: Promise<void>[] | null = []; // nulled on ready

  async function notifyAddDocImpl(path: string): Promise<void> {
    const woven = await weave(ctx, path);
    if (!woven) return;
    targets.add(woven.entryPath);
    targetToPaths.set(woven.entryPath, woven.paths);
  }

  async function notifyAddDoc(path: string): Promise<void> {
    const ret = notifyAddDocImpl(path);
    promisesAddDoc?.push(ret);
    return ret;
  }

  async function notifyChangeDoc(path: string): Promise<void> {
    await weave(ctx, path);
  }

  async function notifyUnlinkDoc(path: string): Promise<void> {
    const paths = targetToPaths.get(path)!;
    for (const path of paths)
      await unlink(path); // TODO use handler
    targets.delete(path);
    targetToPaths.delete(path);
  }

  async function notifyAddLayout(path: string): Promise<void> {
    await resolveLayout(ctx, layoutNameOf(ctx, path));
    // No need to flushStaled() since `path` is added just now: it must not have any reference.
  }

  async function flushStaled() {
    const { done, value: path } = ctx.staled.values().next();
    if (done) return;
    await weave(ctx, path); // removes path from staled.
    setTimeout(flushStaled, 4);
  }

  async function notifyChangeLayout(path: string): Promise<void> {
    await resolveLayout(ctx, layoutNameOf(ctx, path));
    flushStaled();
  }

  async function notifyUnlinkLayout(path: string): Promise<void> {
    const name = layoutNameOf(ctx, path);
    const layout = ctx.layouts.get(name);
    if (!layout) return; // seems never happen but for safety.
    ctx.layouts.delete(name);
    if (layout.refs.size > 0)
      throw new Error(`Layout ${name} is removed though it's refered.`);
  }

  function rmSyncWithLog(path: string): void {
    rmSync(path);
    ctx.logger.debug(`${green("cleared")} ${dim(path)}`);
  }

  if (!resolvedConfig.retainWorkspace) {
    process.on("SIGINT", () => { process.exit(0) });
    process.on("SIGHUP", () => { process.exit(0) });
    process.on("exit", () => {
      // clear all written files (but not workspace itself, to ensure to not removing unrelated file)
      const { workspace, userConfigPath } = resolvedConfig;

      // must be the "sync" version because of the "exit" event.
      // See https://nodejs.org/api/process.html#event-exit
      rmSyncWithLog(userConfigPath);

      targetToPaths.forEach((paths) => {
        paths.forEach(path => rmSyncWithLog(path));
      });

      // delete workspace itself only if it's empty.
      try {
        rmdirSync(workspace);
        ctx.logger.debug(`${green("cleared")} ${dim(workspace)}`);
      } catch (e) {
        if ((e as any)?.code !== "ENOTEMPTY")
          throw e;
      }
    });
  }

  async function updateViteUserConfig(): Promise<void> {
    const userConfig = createViteUserConfig(ctx, targets);
    const content = `export default ${JSON.stringify(userConfig, null, 2)};`;
    await writeTextFile(resolvedConfig.userConfigPath, content);
  }

  async function notifyReady(): Promise<string> {
    if (!promisesAddDoc) return ctx.resolvedConfig.workspace; // must not the case: pass if called twice.
    await Promise.all(promisesAddDoc);
    await updateViteUserConfig();
    targets.addWather(updateViteUserConfig);
    promisesAddDoc = null;
    return ctx.resolvedConfig.workspace;
  }

  return {
    notifyAddDoc,
    notifyChangeDoc,
    notifyUnlinkDoc,
    notifyAddLayout,
    notifyChangeLayout,
    notifyUnlinkLayout,
    notifyReady,
  };
}

export function createViteUserConfig(ctx: SitekitContext, targets: Set<string>): UserConfig {
  let count = 0;
  const input: NonNullable<NonNullable<UserConfig["build"]>["rollupOptions"]>["input"] = {};
  for (const target of targets.values())
    input[`i${count++}`] = target;

  return {
    build: {
      outDir: relative(ctx.configRoot, ctx.resolvedConfig.out),
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
