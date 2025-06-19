/**
 * Print and save file size information.
 *
 * Usage:
 *  $ node ./scripts/stat.mjs [--target <all|normal|full>] [--out <filepath>]
 *
 * Only works after running build.js.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";

const { values: rawOptions } = parseArgs({
  args: process.args,
  options: {
    target: {
      type: "string", // "all" | "normal" | "full"
      default: "all",
      short: "t",
    },
    out: {
      type: "string",
      short: "o",
    },
  },
});
const options = {
  target: rawOptions.target + "",
  out: rawOptions.out ? (rawOptions.out + "") : null,
};
const targetNormal = /^all|normal$/.test(options.target);
const targetFull = /^all|full$/.test(options.target);

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

const allSizeDescs = [];

if (targetFull) {
  console.log("=== stats full ===");
  const sizeDescs = [
    "dist/full/reactive/index.mjs",
    "dist/full/html/bundle.mjs",
    "dist/full/upwind/bundle.mjs",
  ].map(measureSize);
  printSizeDescriptors(sizeDescs);
  allSizeDescs.push(...sizeDescs);
}

if (targetNormal) {
  console.log("=== stats normal ===");
  const sizeDescs = [
    "dist/normal/reactive/index.mjs",
    "dist/normal/html/h.mjs",
    "dist/normal/html/jsx-runtime.mjs",
    "dist/normal/html/bundle.mjs",
    "dist/normal/upwind/bundle.mjs",
  ].map(measureSize);
  printSizeDescriptors(sizeDescs);
  allSizeDescs.push(...sizeDescs);
}

if (options.out) {
  writeFileSync(options.out, JSON.stringify(allSizeDescs, null, 2), "utf-8");
  console.log(`\nSaved to ${options.out}`);
}
