type PickRouteParameter<P extends string, Acc> =
  P extends `:${infer Name}` ? Acc | Name : Acc;

type RouteParameterNamesImpl<P extends string, Acc> =
  P extends `${infer Car}/${infer Cdr}` ?
    RouteParameterNamesImpl<Cdr, PickRouteParameter<Car, Acc>> :
    PickRouteParameter<P, Acc>;

export type RouteParameterNames<P extends string> = RouteParameterNamesImpl<P, never>;
export type RouteParameters<P extends string> = Record<RouteParameterNames<P>, string>;

type TypeCar<L extends any[]> = L extends [] ? never : L[0];
type TypeCdr<L extends any[]> = L extends [L[0], ...infer Cdr] ? Cdr : never;

type TypeRevConcat<Lhs extends T[], Rhs extends T[], T> =
  Lhs extends [infer Car extends T, ...infer Cdr extends T[]] ?
    TypeRevConcat<Cdr, [Car, ...Rhs], T> :
    Rhs;

type TypeListFill<L extends unknown[], R> =
  L extends [unknown, ...infer Cdr] ? [R, ...TypeListFill<Cdr, R>] : [];

type TypeSplit<T extends string, Sep extends string> =
  T extends `${infer Car}${Sep}${infer Cdr}` ?
    [Car, ...TypeSplit<Cdr, Sep>] :
    [T];

type TypeJoin<T extends string[], D extends string> =
    T extends [] ? '' :
    T extends [string] ? T[0] :
    T extends [infer H extends string, ...infer R extends string[]] ? `${H}${D}${TypeJoin<R, D>}` :
    never;

type AsRelativeImpl<From extends string[], To extends string[]> =
  To extends [] ?
    From extends [] ?
      [] :
      TypeListFill<From, ".."> :
    From extends [] ?
      To :
      TypeCar<From> extends TypeCar<To> ?
        TypeCar<To> extends TypeCar<From> ?
          AsRelativeImpl<TypeCdr<From>, TypeCdr<To>> :
          TypeRevConcat<TypeListFill<From, "..">, To, string> :
        TypeRevConcat<TypeListFill<From, "..">, To, string>;

export type AsRelative<From extends string, To extends string> =
  TypeJoin<AsRelativeImpl<TypeSplit<From, "/">, TypeSplit<To, "/">>, "/">;
