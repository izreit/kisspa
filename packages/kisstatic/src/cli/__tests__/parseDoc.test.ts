import { describe, it, expect } from "vitest";
import { parseDoc } from "../parseDoc";

describe("parseDoc()", () => {
  it("parses markdwon with JSX", () => {
    const src = [
      "# foo",
      "",
      "some text",
      "",
      "<ThisIsAComponent prop1={100}>",
      "  <ul>",
      "    <li>pee <Inline /></li>",
      "    <li>zoo</li>",
      "  </ul>",
      "",
      "</ThisIsAComponent>",
      "",
      "followed by a block text",
      "",
      "with <InlineCompo><div class={`foo ${1 + 2}`}>text</div></InlineCompo> something.",
    ].join("\n");

    const { renderedMarkdown, jsxs } = parseDoc(src)

    expect(renderedMarkdown.split("\n")).toEqual([
      '<h1 id=\"foo\">foo<a class=\"header-anchor\" href=\"#foo\" aria-label=\"Permalink to &quot;foo&quot;\"></a></h1>',
      '<p>some text</p>',
      '<div data-sitekit-embed="D0" style="display:none"></div><p>followed by a block text</p>',
      '<p>with <div data-sitekit-embed="D1" style="display:none"></div> something.</p>',
      '',
    ]);

    expect(jsxs).toEqual([
      {
        marker: 'D0',
        code: '<ThisIsAComponent prop1={100}>\n' +
          '  <ul>\n' +
          '    <li>pee <Inline /></li>\n' +
          '    <li>zoo</li>\n' +
          '  </ul>\n' +
          '\n' +
          '</ThisIsAComponent>'
      },
      {
        marker: 'D1',
        code: '<InlineCompo><div class={`foo ${1 + 2}`}>text</div></InlineCompo>'
      }
    ]);
  });

  it("parses markdown with JSXs, a frontmatter, and imports", () => {
    const src = [
      "",
      "",
      "---",
      "title: A Test Title",
      "tag:",
      " - testtag1",
      " - testtag2",
      "---",
      "",
      "import { Foo } from './tee';",
      "import from '@___/module_never_exists';",
      "  import from 'this-line/should-be-warned';",
      "",
      "# foo",
      "",
      "some text",
      "",
      "<ThisIsAComponent prop1={100}>",
      "  <ul>",
      "    <li>pee <Inline /></li>",
      "    <li>zoo</li>",
      "  </ul>",
      "",
      "</ThisIsAComponent>",
      "",
      "followed by a block text",
      "",
      "with <InlineCompo><div class={`foo ${1 + 2}`}>text</div></InlineCompo> something.",
    ].join("\n");

    const parseDocResult = parseDoc(src);
    expect(parseDocResult).toEqual({
      frontmatter: { title: 'A Test Title', tag: ['testtag1', 'testtag2'] },
      headings: [
        { depth: 1, hash: '#foo', label: 'foo' },
      ],
      renderedMarkdown: '<p>  import from &#39;this-line/should-be-warned&#39;;</p>\n' +
        '<h1 id=\"foo\">foo<a class=\"header-anchor\" href=\"#foo\" aria-label=\"Permalink to &quot;foo&quot;\"></a></h1>\n' +
        '<p>some text</p>\n' +
        '<div data-sitekit-embed="D0" style="display:none"></div><p>followed by a block text</p>\n' +
        '<p>with <div data-sitekit-embed="D1" style="display:none"></div> something.</p>\n',
      jsxs: [
        {
          marker: 'D0',
          code: '<ThisIsAComponent prop1={100}>\n' +
            '  <ul>\n' +
            '    <li>pee <Inline /></li>\n' +
            '    <li>zoo</li>\n' +
            '  </ul>\n' +
            '\n' +
            '</ThisIsAComponent>'
        },
        {
          marker: 'D1',
          code: '<InlineCompo><div class={`foo ${1 + 2}`}>text</div></InlineCompo>'
        }
      ],
      importData: [
        { type: 'importenter' },
        { type: 'passthrough', code: "\nimport { Foo } from '" },
        { type: 'href', quote: "'", value: './tee' },
        { type: 'passthrough', code: "';\nimport from '" },
        { type: 'href', quote: "'", value: '@___/module_never_exists' },
        { type: 'passthrough', code: "';\n" },
        { type: 'importleave' }
      ],
      failures: [
        {
          type: 'warn',
          pos: 70,
          line: 12,
          col: 1,
          msg: 'preamble imports must start from the first column of a line.'
        }
      ]
    });
  });
});
