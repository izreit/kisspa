import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __DCE_DISABLE_WATCH__: false,
  },
  test: {
    coverage: {
      provider: "istanbul", // or "v8"
      reporter: "html-spa",
    },
    environmentMatchGlobs: [
      ["src/html/**", "happy-dom"],
      ["src/upwind/**", "happy-dom"],
    ],
  },
});
