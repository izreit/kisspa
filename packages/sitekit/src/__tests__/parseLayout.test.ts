import { describe, it, expect } from "vitest";
import { parseLayout } from "../parseLayout";

describe("parseLayout()", () => {
  it("import", () => {
    const src = [
      `import * as   x from "some-lib";`,
      `import * as y from "./bar";`,
      `import { some, anotherSome as AS } from    "./foo";`,
      ``,
      `<!doctype html>`,
      `<script src="./foo.js">`,
      `var x = 100;`,
      `function f() {}`,
      `</script>`,
      `<!-- foo --`,
      `  foo -->`,
      `<d foo=true ja="foo" ><area/></d>`,
      `<NavList foo={true} ja={"foo"} j={<div>foo</div>} ><area/></NavList>`,
      `<title>{%sitekit:title%} - Web</title>`,
      `<area foo="bee" tee:zoo doulbe='ppee"poo' />`,
    ].join("\n");

    const parseResult = parseLayout(src);
    expect(parseResult).toEqual({
      success: true,
      failures: [],
      parsed: [
        { type: 'jsenter' },
        {
          code: "import * as   x from \"",
          type: "passthrough",
        },
        {
          quote: "\"",
          type: "href",
          value: "some-lib",
        },
        {
          code: "\";\n" +
            "import * as y from \"",
          type: "passthrough",
        },
        {
          quote: "\"",
          type: "href",
          value: "./bar",
        },
        {
          code: "\";\n" +
            "import { some, anotherSome as AS } from    \"",
          type: "passthrough",
        },
        {
          quote: "\"",
          type: "href",
          value: "./foo",
        },
        {
          code: "\";\n" +
            "\n",
          type: "passthrough",
        },
        { type: 'jsleave' },
        {
          type: 'passthrough',
          code: '<!doctype html>\n' +
            '<script src="'
        },
        {
          type: 'href',
          quote: '"',
          value: './foo.js'
        },
        {
          type: 'passthrough',
          code: '">\n' +
            'var x = 100;\n' +
            'function f() {}\n' +
            '</script>\n' +
            '<!-- foo --\n' +
            '  foo -->\n' +
            '<d foo=true ja="foo" ><area/></d>\n'
        },
        { type: 'jsenter' },
        {
          type: 'passthrough',
          code: '<NavList foo={true} ja={"foo"} j={<div>foo</div>} ><area/></NavList>'
        },
        { type: 'jsleave' },
        {
          type: 'passthrough',
          code: '\n' +
            '<title>{%sitekit:title%} - Web</title>\n' +
            `<area foo="bee" tee:zoo doulbe='ppee"poo' />`
        }
      ]
    });
  });
});
