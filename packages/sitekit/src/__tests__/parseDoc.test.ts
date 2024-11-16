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

    const { markdown, jsxFrags } = parseDoc(src)

    expect(markdown.split("\n")).toEqual([
      '<h1>foo</h1>',
      '<p>some text</p>',
      '<div data-sitekit-embed="0" style="display:none" /><p>followed by a block text</p>',
      '<p>with <div data-sitekit-embed="1" style="display:none" /> something.</p>',
      '',
    ]);

    expect(jsxFrags).toEqual([
      {
        marker: '0',
        code: '<ThisIsAComponent prop1={100}>\n' +
          '  <ul>\n' +
          '    <li>pee <Inline /></li>\n' +
          '    <li>zoo</li>\n' +
          '  </ul>\n' +
          '\n' +
          '</ThisIsAComponent>'
      },
      {
        marker: '1',
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
      markdown: '<p>  import from &#39;this-line/should-be-warned&#39;;</p>\n' +
        '<h1>foo</h1>\n' +
        '<p>some text</p>\n' +
        '<div data-sitekit-embed="2" style="display:none" /><p>followed by a block text</p>\n' +
        '<p>with <div data-sitekit-embed="3" style="display:none" /> something.</p>\n',
      jsxFrags: [
        {
          marker: '2',
          code: '<ThisIsAComponent prop1={100}>\n' +
            '  <ul>\n' +
            '    <li>pee <Inline /></li>\n' +
            '    <li>zoo</li>\n' +
            '  </ul>\n' +
            '\n' +
            '</ThisIsAComponent>'
        },
        {
          marker: '3',
          code: '<InlineCompo><div class={`foo ${1 + 2}`}>text</div></InlineCompo>'
        }
      ],
      importData: [
        { type: 'jsenter' },
        { type: 'passthrough', code: "\nimport { Foo } from '" },
        { type: 'href', quote: "'", value: './tee' },
        { type: 'passthrough', code: "';\nimport from '" },
        { type: 'href', quote: "'", value: '@___/module_never_exists' },
        { type: 'passthrough', code: "';\n" },
        { type: 'jsleave' }
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
