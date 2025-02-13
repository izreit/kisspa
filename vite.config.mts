import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { defineConfig } from "vite";

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

// Instead of one integrated entry, use a seperated entry for each target
// to make them independent each other. In other words, vite produces
// chunk script file for the integrated big entry.
const entryTable = {
  reactive: { "normal/reactive/index": resolve(__dirname, "src", "reactive", "index.ts") },
  html: { "normal/html/bundle": resolve(__dirname, "src", "html", "bundle.ts") },
  whole: { "normal/upwind/bundle": resolve(__dirname, "src", "upwind", "bundle.ts") },
  "reactive-full": { "full/reactive/index": resolve(__dirname, "src", "reactive", "index.ts") },
  "html-full": { "full/html/bundle": resolve(__dirname, "src", "html", "bundle.ts") },
  "whole-full": { "full/upwind/bundle": resolve(__dirname, "src", "upwind", "bundle.ts") },
  "extra-cloneutil": { "full/reactive/cloneutil": resolve(__dirname, "src", "reactive", "cloneutil.ts") },
  "extra-preset": {
    "full/upwind/preset/colors": resolve(__dirname, "src", "upwind", "preset", "colors.ts")
  },
};

export default defineConfig({
  define: {
    __DCE_DISABLE_WATCH__: !target.includes("full"),
  },
  build: {
    emptyOutDir: clean,
    outDir: "dist",
    lib: {
      entry: entryTable[target],
      formats: ["es"],
      fileName: (_format, name) => `${name}.raw.mjs`,
    },

    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        minifyInternalExports: true,
      }
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
