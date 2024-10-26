import { execSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const { KISSPA_BUILD } = process.env;
const mode = /^normal|full|all$/.test(KISSPA_BUILD) ? KISSPA_BUILD : "all";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = relative(process.cwd(), join(__dirname, ".."));

function path(...args) {
  return join(root, ...args);
}

function run(s) {
  console.log("> " + s);
  execSync(s, { stdio: "inherit" });
}

run(`npx vite build -- -ct upwind-preset`);
if (mode === "full" || mode === "all") {
  run(`npx vite build -- -t reactive-full`);
  run(`npx vite build -- -t html-full`);
  run(`npx vite build -- -t whole-full`);
  run(`npx tsc -p ${path("tsconfig.build.json ")} --emitDeclarationOnly --outDir ${path("dist/full")}`);
}
if (mode === "normal" || mode === "all") {
  run(`npx vite build -- -t reactive`);
  run(`npx vite build -- -t html`);
  run(`npx vite build -- -t whole`);
  run(`npx tsc -p ${path("tsconfig.build.json ")} --emitDeclarationOnly --outDir ${path("dist/normal")}`);
}
