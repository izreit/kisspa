import { resolve, dirname } from "node:path";
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
    clean: { type: "boolean" },
    target: { type: "string", short: "t" },
  },
}).values;
const clean = !!opts.clean;
const target = opts.target ?? "whole";

// Instead of one integrated entry, use a seperated entry for each target
// to make them independent each other. In other words, vite produces
// chunk script file for the integrated big entry.
const entryTable = {
  whole: { "upwind/bundle": resolve(__dirname, "src", "upwind", "bundle.ts") },
  reactive: { "reactive/index": resolve(__dirname, "src", "reactive", "index.ts") },
  html: { "html/bundle": resolve(__dirname, "src", "html", "bundle.ts") },
};

export default defineConfig({
  build: {
    emptyOutDir: clean,
    outDir: "dist",
    lib: {
      entry: entryTable[target],
      formats: ["cjs"],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        minifyInternalExports: true,
      }
    },
    minify: "terser",
    terserOptions: {
      mangle: {
        properties: {
          regex: /.*_$/,
        },
      }
    },
  },
});
