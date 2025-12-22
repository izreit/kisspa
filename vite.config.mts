// This file is not the entry point of build scripts. See scripts/build.mjs.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { defineConfig, type UserConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = (() => {
  const i = process.argv.indexOf("--");
  return (i >= 0) ? process.argv.slice(i + 1) : []
})();

const opts = parseArgs({
  args,
  allowPositionals: false,
  options: {
    clean: { type: "boolean", short: "c" },
    target: { type: "string", short: "t" },
  },
}).values;
const clean = !!opts.clean;
const target = opts.target ?? "whole";

function path(segs: string): string {
  return resolve(__dirname, ...segs.split("/"));
}

interface TargetConfig {
  entry: Exclude<NonNullable<UserConfig["build"]>["lib"], false | undefined>["entry"];
  outDir?: NonNullable<UserConfig["build"]>["outDir"];
  external?: NonNullable<NonNullable<UserConfig["build"]>["rollupOptions"]>["external"];
}

// Instead of one integrated entry, use a seperated entry for each target
// to make them independent each other. In other words, vite produces
// chunk script file for the integrated big entry.
const targetConfigTable: { [key: string]: TargetConfig } = {
  reactive: {
    entry: { "reactive/index": path("src/reactive/index.ts") },
  },
  h: {
    entry: { "html/h": path("src/html/h.ts") },
  },
  jsx: {
    entry: { "html/jsx-runtime": path("src/html/jsx-runtime.ts") },
  },
  html: {
    entry: { "entrypoint-html": path("src/index-html.ts") },
    external: [path("src/reactive/index.ts")],
  },
  whole: {
    entry: { "entrypoint": path("src/index.ts") },
    external: [path("src/index-html.ts")],
  },
  "preset-colors": {
    entry: { "extra/preset-colors/index": path("src/extra/preset-colors/index.ts") },
  },
  watch: {
    entry: { "extra/watch/index": path("src/extra/watch/index.ts") },
    external: [path("src/reactive/index.ts")],
  },
  "stat-html": {
    entry: { "stat-bundle-html": path("src/stat/stat-bundle-html.ts") },
    outDir: "stat",
  },
  "stat-whole": {
    entry: { "stat-bundle": path("src/stat/stat-bundle.ts") },
    outDir: "stat",
  },
};

const targetConfig = targetConfigTable[target];
if (!targetConfig)
  throw new Error(`unknown target: ${target}`);

export default defineConfig({
  build: {
    emptyOutDir: clean,
    outDir: targetConfig.outDir ?? "dist",
    lib: {
      entry: targetConfig.entry,
      formats: ["es"],
      fileName: (_format, name) => `${name}.raw.mjs`,
    },

    rollupOptions: {
      external: targetConfig.external,
      output: {
        inlineDynamicImports: true,
        minifyInternalExports: true,
      },
    },

    // NOTE Vite doesn't minify ESM (.mjs, "es" output).
    // Instead, we minify .mjs manually. See scripts/build.mjs.
    //
    // They said that minifying ESM library is not appropriate for tree-shaking
    // but we prefer to provide a mangled (pre-minified) version rather than
    // to rely on user-dependent optimizations.
    // (ref. https://github.com/vitejs/vite/issues/5167)
    minify: "terser",
    terserOptions: {
      // Mangle any property names ends with '_' (e.g. insert_, name_).
      // Use them only for internal properties.
      mangle: {
        properties: {
          regex: /.*_$/,
        },
      }
    }
  },
});
