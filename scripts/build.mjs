/**
 * Build the library.
 *
 * Usage:
 *  $ node ./scripts/build.mjs
 */

import { execSync } from "node:child_process";
import { copyFileSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

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
function minifyRawMjs(src) {
  src = path(src);
  const out = src.replace(/\.raw\.mjs$/, ".mjs");
  run(`npx terser ${src} -c -m --mangle-props regex=/_$/ -o ${out} --toplevel`);
}

// build main
run("npx vite build -- -t reactive --clean");
run("npx vite build -- -t html");
run("npx vite build -- -t h");
run("npx vite build -- -t jsx");
run("npx vite build -- -t whole");
run("npx vite build -- -t preset-colors");
run("npx vite build -- -t watch");
run(`npx tsc -p ${path("tsconfig.build.json")} --emitDeclarationOnly --outDir ${path("dist")}`);
minifyRawMjs("dist/reactive/index.raw.mjs");
minifyRawMjs("dist/html/bundle.raw.mjs");
minifyRawMjs("dist/html/h.raw.mjs");
minifyRawMjs("dist/html/jsx-runtime.raw.mjs");
minifyRawMjs("dist/upwind/bundle.raw.mjs");
minifyRawMjs("dist/extra/preset-colors/index.raw.mjs");
minifyRawMjs("dist/extra/watch/index.raw.mjs");

// build supplements
rmSync(path("dist_supplement"), { recursive: true });
run(`npx tsc -p ${path("tsconfig.build-supplement.json")}`);
