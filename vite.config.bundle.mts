import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

function path(segs: string): string {
  return resolve(__dirname, ...segs.split("/"));
}

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "dist/bundle",

    rollupOptions: {
      input: {
        "index-reactive": path("src/reactive/index.ts"),
        "index-html": path("src/index-html.ts"),
        "index": path("src/index.ts"),
        "h": path("src/html/h.ts"),
        "jsx-runtime": path("src/html/jsx-runtime.ts"),
        "extra/preset-colors/index": path("src/extra/preset-colors/index.ts"),
        "extra/watch/index": path("src/extra/watch/index.ts"),
      },
      preserveEntrySignatures: "strict",
      output: {
        entryFileNames: "[name].mjs",
        chunkFileNames: "chunk/[name].mjs",
        format: "es",
        minifyInternalExports: false,
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
