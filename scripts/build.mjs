/**
 * Build the library.
 *
 * Usage:
 *  $ node ./scripts/build.mjs [--target <all|normal|full>]
 */

import { execSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values: rawOptions } = parseArgs({
  args: process.args,
  options: {
    target: {
      type: "string",
      default: "all",
      short: "t",
    },
  },
});
const target = rawOptions.target + "";
const targetNormal = /^all|normal$/.test(target);
const targetFull = /^all|full$/.test(target);

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = relative(process.cwd(), join(__dirname, ".."));

function path(...args) {
  return join(root, ...args);
}

function run(s) {
  console.log("> " + s);
  execSync(s, { stdio: "inherit" });
}

// NOTE Apply terser. Only used for .mjs (ESM) because they are not minified by Vite.
// See comments on "terserOptions" in vite.config.mts for the detail.
function minify(path) {
  const out = path.replace(/\.raw\.mjs$/, ".mjs");
  run(`npx terser ${path} -c -m --mangle-props regex=/_$/ -o ${out} --toplevel`);
}

// build unbundled
run("npx vite build -- --clean -t extra-preset");
minify("dist/full/upwind/preset/colors.raw.mjs");
run("npx vite build -- -t extra-cloneutil");
minify("dist/full/reactive/cloneutil.raw.mjs");

// build full
if (targetFull) {
  run("npx vite build -- -t reactive-full");
  run("npx vite build -- -t html-full");
  run("npx vite build -- -t whole-full");
  run(`npx tsc -p ${path("tsconfig.build.json ")} --emitDeclarationOnly --outDir ${path("dist/full")}`);
  minify("dist/full/reactive/index.raw.mjs");
  minify("dist/full/html/bundle.raw.mjs");
  minify("dist/full/upwind/bundle.raw.mjs");
}

// build normal
if (targetNormal) {
  run("npx vite build -- -t reactive");
  run("npx vite build -- -t html");
  run("npx vite build -- -t h");
  run("npx vite build -- -t jsx");
  run("npx vite build -- -t whole");
  run(`npx tsc -p ${path("tsconfig.build.json ")} --emitDeclarationOnly --outDir ${path("dist/normal")}`);
  minify("dist/normal/reactive/index.raw.mjs");
  minify("dist/normal/html/bundle.raw.mjs");
  minify("dist/normal/html/h.raw.mjs");
  minify("dist/normal/html/jsx-runtime.raw.mjs");
  minify("dist/normal/upwind/bundle.raw.mjs");
}
