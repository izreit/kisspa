import { defineConfig } from "vitest/config";

export default defineConfig({
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
