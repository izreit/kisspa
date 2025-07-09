/**
 * Print and save file size information.
 *
 * Usage:
 *  $ node ./scripts/stat.mjs [--out <filepath>] [--stat-only]
 *
 * Only works after running build.js.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";

const { values: rawOptions } = parseArgs({
  options: {
    out: {
      type: "string",
      short: "o",
    },
    "stat-only": {
      type: "boolean",
      short: "S",
      default: false,
    },
  },
});
const options = {
  out: rawOptions.out ? (rawOptions.out + "") : null,
  statOnly: !!rawOptions["stat-only"],
};

function measureSize(path) {
  const input = readFileSync(path);
  const gzipSize = gzipSync(input, { level: 9 }).length;
  return { path, size: input.byteLength, gzipSize };
}

function asKB(n) {
  return `${(n / 1024).toFixed(2)} kB`;
}

function printSizeDescriptors(sizeDescs) {
  const len = Math.max(...sizeDescs.map(({ path }) => path.length));
  for (const { path, size, gzipSize } of sizeDescs) {
    console.log(`${path + " ".repeat(len - path.length)}\t${asKB(size)} | gzip: ${asKB(gzipSize)}`);
  }
}

const targettFilesBase = [
  "dist/reactive/index.mjs",
  "dist/html/h.mjs",
  "dist/html/jsx-runtime.mjs",
  "dist/entrypoint-html.mjs",
  "dist/entrypoint.mjs",
  "dist/extra/watch/index.mjs",
];
const targetFilesStat = [
  "stat/stat-bundle-html.mjs",
  "stat/stat-bundle.mjs",
];

const hash = execSync("git rev-parse --short HEAD").toString().trim();
console.log(`Commit ${hash}`);

console.log("=== stats ===");
const targetFiles = options.statOnly ? targetFilesStat : [...targettFilesBase, ...targetFilesStat];
const sizeDescs = targetFiles.map(measureSize);
printSizeDescriptors(sizeDescs);

if (options.out) {
  const content = { hash, sizes: sizeDescs };
  writeFileSync(options.out, JSON.stringify(content, null, 2), "utf-8");
  console.log(`\nSaved to ${options.out}`);
}
