import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist",
    lib: {
      entry: {
        "index": resolve(__dirname, "src", "index.ts"),
        "reactive/index": resolve(__dirname, "src", "reactive", "index.ts"),
        "html/index": resolve(__dirname, "src", "html", "index.ts"),
      },
      fileName: (_format, name) => `${name}.js`,
    },
  },
});
