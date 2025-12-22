export function nameCandidatesOf(basename: string): string[] {
  let base = basename
    .replace(/^\d*/, "") // remove prefix 0-9
    .replace(/[^A-Za-z0-9_$-]/g, "") // remove invalid chars except "-"
    .replace(/-([a-z]?)/g, (_, c) => c.toUpperCase()) // remove "-" and capitalize the next
  base = base.charAt(0).toUpperCase() + base.slice(1);

  if (!/_/.test(base))
    return [base];

  return [
    base, // e.g. Foo_bar1_Zoo
    base.replace(/_([a-z0-9]?)/g, (_, c) => "_" + c.toUpperCase()), // e.g. Foo_Bar1_Zoo
    base.replace(/_([a-z0-9]?)/g, (_, c) => c.toUpperCase()), // e.g. FooBar1Zoo
    base.replace(/_/g, ""),  // e.g. Foobar1Zoo
  ];
}

export const INTERFACE_VERSION = 1;
