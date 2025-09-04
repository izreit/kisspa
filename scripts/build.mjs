import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
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

// raw and type declarations
rmSync(path("dist/raw"), { recursive: true, force: true });
run(`npx tsc -p ${path("tsconfig.build.json")} --outDir ${path("dist/raw")}`);

// bundle
run(`npx vite build -c ${path("vite.config.bundle.mts")}`);

// supplements
rmSync(path("dist_supplement"), { recursive: true, force: true });
run(`npx tsc -p ${path("tsconfig.build-supplement.json")}`);

// stat (must be placed after the `bundle` step)
rmSync(path("stat"), { recursive: true, force: true });
run(`npx vite build -c ${path("vite.config.stat.mts")} --mode html`);
run(`npx vite build -c ${path("vite.config.stat.mts")} --mode full`);
