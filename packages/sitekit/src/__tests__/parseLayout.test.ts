import { describe, it, expect } from "vitest";
import { parseLayout } from "../parseLayout";

function jj(x: any): any { return JSON.parse(JSON.stringify(x)); }

describe("parseLayout()", () => {
  it("import", () => {
    const src = [
      `import * as   x from "./foo";`,
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
      parsed: [
        {
          type: 'imports',
          code: 'import * as   x from "./foo";\n' +
            'import * as y from "./bar";\n' +
            'import { some, anotherSome as AS } from    "./foo";\n' +
            '\n'
        },
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
        { type: 'jsxenter' },
        {
          type: 'passthrough',
          code: '<NavList foo={true} ja={"foo"} j={<div>foo</div>} ><area/></NavList>'
        },
        { type: 'jsxleave' },
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
