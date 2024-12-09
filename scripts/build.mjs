import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const { KISSPA_BUILD } = process.env;
const mode = /^normal|full|all|stat$/.test(KISSPA_BUILD) ? KISSPA_BUILD : "all";

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
function minifyByTerser(path) {
  const out = path.replace(/\.raw\.mjs$/, ".mjs");
  run(`npx terser ${path} -c -m --mangle-props regex=/_$/ -o ${out} --toplevel`);
}

function printStat(path) {
  const stringifySize = n => `${(n / 1024).toFixed(2)} kB`;
  const input = readFileSync(path);
  const gzipLen = gzipSync(input, { level: 9 }).length;
  console.log(`${path}\t${stringifySize(input.byteLength)} | gzip: ${stringifySize(gzipLen)}`);
}

if (mode !== "stat") {
  run(`npx vite build -- -ct upwind-preset`);
}

if (mode === "full" || mode === "all") {
  run(`npx vite build -- -t reactive-full`);
  run(`npx vite build -- -t html-full`);
  run(`npx vite build -- -t whole-full`);
  run(`npx tsc -p ${path("tsconfig.build.json ")} --emitDeclarationOnly --outDir ${path("dist/full")}`);
  minifyByTerser("dist/full/reactive/index.raw.mjs");
  minifyByTerser("dist/full/html/bundle.raw.mjs");
  minifyByTerser("dist/full/upwind/bundle.raw.mjs");
}

if (mode === "normal" || mode === "all") {
  run(`npx vite build -- -t reactive`);
  run(`npx vite build -- -t html`);
  run(`npx vite build -- -t whole`);
  run(`npx tsc -p ${path("tsconfig.build.json ")} --emitDeclarationOnly --outDir ${path("dist/normal")}`);
  minifyByTerser("dist/normal/reactive/index.raw.mjs");
  minifyByTerser("dist/normal/html/bundle.raw.mjs");
  minifyByTerser("dist/normal/upwind/bundle.raw.mjs");
}

if (mode === "all" || mode === "stat") {
  console.log("=== stat ===");
  printStat("dist/full/reactive/index.mjs");
  printStat("dist/full/html/bundle.mjs");
  printStat("dist/full/upwind/bundle.mjs");
  printStat("dist/normal/reactive/index.mjs");
  printStat("dist/normal/html/bundle.mjs");
  printStat("dist/normal/upwind/bundle.mjs");
}
