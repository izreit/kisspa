import pico from "picocolors";

const { cyan, yellow, red, gray, dim, bold } = pico;

let _timeFormatterCache: Intl.DateTimeFormat;

function timestamp(): string {
  _timeFormatterCache ||= new Intl.DateTimeFormat([], { hour: "numeric", minute: "numeric", second: "numeric" });
  return _timeFormatterCache.format(new Date());
}

const logLevels = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
} as const;

export type LogLevel = Exclude<keyof typeof logLevels, "silent">;

type PicocolorsColorizer = (input: string | number | null | undefined) => string

export interface KisstaticLogger {
  info(msg: string): void;
  warn(msg: string): void;
  warnOnce(msg: string): void;
  warnRaw(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

export function createKisstaticLogger(level: LogLevel): KisstaticLogger {
  const prefixColorizerTable: { [key in LogLevel]: PicocolorsColorizer } = {
    error: red,
    warn: yellow,
    info: cyan,
    debug: gray,
  };

  const prefix = "[kisstatic]";
  const thresh = logLevels[level];
  const warnedMessages = new Set<string>();

  function output(type: LogLevel, msg: string): void {
    if (logLevels[type] > thresh) return;
    const method = type === "info" ? "log" : type;
    const tag = (prefixColorizerTable[type] || red)(bold(prefix));
    console[method](`${dim(timestamp())} ${tag} ${msg}`);
  }

  return {
    info(msg) {
      output("info", msg);
    },
    warn(msg) {
      output("warn", msg);
    },
    warnOnce(msg) {
      if (warnedMessages.has(msg)) return;
      output("warn", msg);
      warnedMessages.add(msg);
    },
    warnRaw(msg) {
      console.warn(msg);
    },
    error(msg) {
      output("error", msg);
    },
    debug(msg) {
      output("debug", msg);
    }
  };
}
