
export const createEmptyObj = () => Object.create(null);

export const objKeys = <T extends object>(o: T): (keyof T)[] => (Object.keys(o) as (keyof T)[]);

export const objForEach = <T extends object>(o: T, f: (v: T[keyof T], k: keyof T) => void): void => objKeys(o).forEach(k => f(o[k], k));
