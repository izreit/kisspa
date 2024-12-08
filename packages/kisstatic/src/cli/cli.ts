import { parseArgs } from "node:util";
import { build } from "./build.js";
import { preview } from "./preview.js";
import { createKisstaticDevServer } from "./devServer.js";

export async function cli(args: string[]): Promise<void> {
  const { positionals, values: options } = parseArgs({
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

  const [command] = positionals;
  switch (command) {
    case "dev": case "serve": {
      await createKisstaticDevServer({
        configRoot: options.config,
        debugOptionsOverride: {
          workspace: options["debug-workspace"],
          retainWorkspace: options["debug-retain-workspace"],
        },
      });
      break;
    }

    case "build": {
      await build({
        configRoot: options.config,
        debugOptionsOverride: {
          workspace: options["debug-workspace"],
          retainWorkspace: options["debug-retain-workspace"],
        },
      });
      break;
    }

    case "preview": {
      await preview({
        configRoot: options.config,
        debugOptionsOverride: {
          workspace: options["debug-workspace"],
          retainWorkspace: options["debug-retain-workspace"],
        },
      });
      break;
    }

    default: {
      console.error(`unknown command '${command}'`);
      return;
    }
  }
}
