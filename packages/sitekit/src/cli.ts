import { parseArgs } from "node:util";
import { start } from "./deamon.js";

export async function cli(args: string[]): Promise<void> {
  const { positionals: _positionals, values: options } = parseArgs({
    allowPositionals: true,
    options: {
      config: {
        short: "c",
        type: "string",
        default: ".",
      },
      "debug-workspace": {
        type: "string",
        default: undefined,
      },
      "debug-retain-workspace": {
        type: "boolean",
        default: false,
      },
    },
    args,
  });

  await start({
    configRoot: options.config,
    debugOptionsOverride: {
      workspace: options["debug-workspace"],
      retainWorkspace: options["debug-retain-workspace"],
    },
  });
}
