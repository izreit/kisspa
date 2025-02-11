import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __DCE_DISABLE_WATCH__: false,
  },
  test: {
    coverage: {
      provider: "istanbul", // or "v8"
      reporter: "html-spa",
      include: ["src/**/*"],
    },
    workspace: [
      {
        extends: true,
        test: {
          environment: "happy-dom",
        }
      }
    ],
  },
});
