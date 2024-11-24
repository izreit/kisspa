import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { dirname } from "path";

export interface SitekitHandlers {
  readTextFile: (path: string) => Promise<string>;
  writeTextFile: (path: string, content: string) => Promise<void>;
  isFile: (path: string) => Promise<boolean>;
}

export const defaultHandlers: SitekitHandlers = {
  readTextFile: p => readFile(p, "utf-8"),

  writeTextFile: async (p, content) => {
    await mkdir(dirname(p), { recursive: true });
    return writeFile(p, content, "utf-8");
  },

  isFile: p => stat(p).then(st => st.isFile(), () => false),
};
