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
    console.log(parseDocResult);
    expect(1).toBe(0);
  });
});
