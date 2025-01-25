export const createEmptyObj = () => Object.create(null);

export const objKeys = <T extends { [key: string]: any }>(o: T): (string & keyof T)[] => (Object.keys(o) as (string & keyof T)[]);

export const objForEach = <T extends { [key: string]: any }>(o: T, f: (v: T[string & keyof T], k: string & keyof T) => void): void => {
  for (const k of objKeys(o))
    f(o[k], k);
};
