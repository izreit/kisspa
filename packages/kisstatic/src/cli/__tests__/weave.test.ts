import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createSitekitContext, defaultHandlers, SitekitHandlers } from "../context";
import { weave } from "../weave";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    const ctx = await createSitekitContext({
      configRoot: join(__dirname, "fixtures/simple/.sitekit/"),
      handlers,
    });
    await weave(ctx, "../pages/index.md");

    const { written } = handlers;
    expect(Object.keys(written).sort()).toEqual([
      'fixtures/simple/.sitekit/.wspace/index.doc.jsx',
      'fixtures/simple/.sitekit/.wspace/index.html',
      'fixtures/simple/.sitekit/.wspace/index.layout.jsx',
    ]);

    expect(written['fixtures/simple/.sitekit/.wspace/index.html']).toEqual(
      '<!doctype html>\n' +
      '<title>Top</title>\n' +
      '\n' +
      '<h1>Test Top</h1>\n' +
      '\n' +
      '<h1 id="title-heading1">Title Heading1<a class="header-anchor" href="#title-heading1" aria-label="Permalink to &quot;Title Heading1&quot;"></a></h1>\n' +
      '<p>string in markdown.</p>\n' +
      '<p><a href="./some.html">some</a></p>\n' +
      '<h1 id="h2-elem">H2 elem<a class="header-anchor" href="#h2-elem" aria-label="Permalink to &quot;H2 elem&quot;"></a></h1>\n' +
      '<p>Lorem ipsum dolor sit amet, consectetur ...</p>\n' +
      '\n' +
      '\n' +
      '<div>Click to increment: <div data-sitekit-embed="L0" style="display:none"></div></div>\n' +
      '<script type="text/javascript">const __sitekit_page_props__ = Object.freeze({"path":"index.md","frontmatter":{"layout":"default"},"headings":[{"depth":1,"hash":"#title-heading1","label":"Title Heading1"},{"depth":1,"hash":"#h2-elem","label":"H2 elem"}]})</script>\n' +
      '<script type="module" src="./index.layout.jsx"></script>\n' +
      '<script type="module" src="./index.doc.jsx"></script>\n',
    );

    expect(written['fixtures/simple/.sitekit/.wspace/index.layout.jsx']).toEqual(
      'import { attach as __kisspa_attach__ } from "kisspa";\n' +
      'import { TestComp } from "../theme/components/TestComp";\n' +
      '\n' +
      `__kisspa_attach__({ after: document.querySelector('[data-sitekit-embed="L0"]') }, <TestComp />);\n`,
    );

    expect(written['fixtures/simple/.sitekit/.wspace/index.doc.jsx']).toEqual(
      '\n'
    );
  });
});
