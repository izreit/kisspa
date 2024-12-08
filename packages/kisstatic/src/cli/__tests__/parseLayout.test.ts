import { describe, it, expect } from "vitest";
import { parseLayout } from "../parseLayout";

describe("parseLayout()", () => {
  it("parses imports followed by html", () => {
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
      `<title>{%kisstatic:title%} - Web</title>`,
      `<area foo="bee" tee:zoo doulbe='ppee"poo' />`,
    ].join("\n");

    const parseResult = parseLayout(src);
    expect(parseResult).toEqual({
      success: true,
      failures: [],
      parsed: [
        { type: 'importenter' },
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
        { type: 'importleave' },
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
            '<title>',
        },
        {
          type: "placeholder",
          value: "title",
        },
        {
          type: 'passthrough',
          code: " - Web</title>\n" +
            `<area foo="bee" tee:zoo doulbe='ppee"poo' />`
        },
        {
          type: 'closehtml',
        },
      ]
    });
  });

  it("detects the end of the html tag", () => {
    const src = [
      `import * as x from "some-lib";`,
      ``,
      `<!doctype html>`,
      `<html>`,
      `<title>Test Title</title>`,
      `<NavList foo={true} ja={"foo"} j={<div>foo</div>} ><area/></NavList>`,
      `{%kisstatic:body%}`,
      `<area foo="bee" tee:zoo doulbe='ppee"poo' />`,
      `</html>`,
    ].join("\n");

    const parseResult = parseLayout(src);
    expect(parseResult).toEqual({
      success: true,
      parsed: [
        { type: 'importenter' },
        { type: 'passthrough', code: 'import * as x from "' },
        { type: 'href', quote: '"', value: 'some-lib' },
        { type: 'passthrough', code: '";\n\n' },
        { type: 'importleave' },
        {
          type: 'passthrough',
          code: '<!doctype html>\n<html>\n<title>Test Title</title>\n'
        },
        { type: 'jsenter' },
        {
          type: 'passthrough',
          code: '<NavList foo={true} ja={"foo"} j={<div>foo</div>} ><area/></NavList>'
        },
        { type: 'jsleave' },
        { type: 'passthrough', code: '\n' },
        { type: 'placeholder', value: 'body' },
        {
          type: 'passthrough',
          code: `\n<area foo="bee" tee:zoo doulbe='ppee"poo' />\n`
        },
        { type: 'closehtml' },
        { type: 'passthrough', code: '</html>' }
      ],
      failures: []
    });
  });
});
