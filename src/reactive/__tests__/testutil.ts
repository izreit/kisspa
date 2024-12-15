export function createLogBuffer() {
  let buffer: string[] = [];
  return {
    log: (s: string) => {
      buffer.push(s);
    },
    reap: () => {
      const ret = buffer;
      buffer = [];
      return ret;
    }
  };
}
