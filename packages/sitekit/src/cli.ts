import { parseArgs } from "node:util";
import { start } from "./deamon";

export async function cli(args: string[]): Promise<void> {
  const { positionals, values: { config: configPath } } = parseArgs({
    allowPositionals: true,
    options: {
      config: {
        short: "c",
        type: "string",
        default: ".",
      },
    },
    args,
  });

  console.log(positionals, configPath);

  await start({ configRoot: configPath });
}
