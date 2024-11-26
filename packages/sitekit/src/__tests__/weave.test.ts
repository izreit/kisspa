import { join, relative } from "node:path";
import { describe, it, expect } from "vitest";
import { weave } from "../weave";
import { createSitekitContext, defaultHandlers, SitekitHandlers } from "../context";

interface EphemeralSitekitHandlers extends SitekitHandlers {
  written: { [path: string]: string };
}

function createEphemeralSitekitHandlers(root: string): EphemeralSitekitHandlers {
  const written: { [path: string]: string } = {};
  return {
    ...defaultHandlers,
    written,
    writeTextFile: async (path, content) => {
      const relpath = relative(root, path);
      if (/^(?:\/|\.\.\/)/.test(relpath))
        throw new Error("mock error: writing outside the mock root");
      written[relpath] = content;
      return Promise.resolve();
    },
  };
}

describe("weave", () => {
  it("can handle simple html using JSX", async () => {
    const handlers = createEphemeralSitekitHandlers(__dirname);
    const ctx = await createSitekitContext(handlers, join(__dirname, "fixtures/simple/.sitekit/"));
    await weave(ctx, "../pages/index.md");
    console.log(handlers.written);
  });
});
