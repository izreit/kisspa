import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type UserConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

function path(segs: string): string {
  return resolve(__dirname, ...segs.split("/"));
}

export default defineConfig(({ mode }): UserConfig => {
  return {
    build: {
      emptyOutDir: false,
      outDir: "stat",
      rollupOptions: {
        input: mode === "html" ?
          { "stat-bundle-html": path("dist/bundle/index-html.mjs") } :
          { "stat-bundle": path("dist/bundle/index.mjs") },
        preserveEntrySignatures: "strict",
        output: {
          entryFileNames: "[name].mjs",
          inlineDynamicImports: true,
          format: "es",
        },
      },
    },
  };
});
