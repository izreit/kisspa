import type { AssembleContext, Component, SpecialComponent } from "../../index-html.js";
import { autorun, createSpecial, Dynamic, observe } from "../../index-html.js";
import type { LocationLike, NavigateSource, RouteComponentProps, RouteTable } from "./types";

export function createRouterComponent<Paths extends string>(
  src: NavigateSource,
  routes: RouteTable<Paths>,
): Component<{}> {
  const dynamicFun = (Dynamic as SpecialComponent<Dynamic.Props<RouteComponentProps<string, string>>>).special;

  // create matcher function from route path
  // (e.g. "foo/:bar/:zoo" => /^foo\/(?<bar>[^\/]+)\/(?<zoo>[^\/]+)$/)
  const routeParamRe = /(?:\/|^):[\w_][\w\d_]*(?=\/|$)/g; // "/:foo" or ":bar" (at the line head)
  const matchers = Object.keys(routes).map(path => ({
    path,
    re: new RegExp(`^${path.replace(routeParamRe, s => s.replace(":", "(?<") + ">[^\\/]+)")}$`),
  } as { path: Paths, re: RegExp }));

  type ParsedRoute = Omit<RouteComponentProps<string, string>, "navigate">;
  const makeNullParsedRoute = (): ParsedRoute => (
    { pathname: "", search: "", hash: "", state: {}, path: "", params: {} }
  );

  const matchPath = (navloc: LocationLike): ParsedRoute | null => {
    const { pathname } = navloc;
    for (let i = 0; i < matchers.length; ++i) {
      const { path, re } = matchers[i];
      const m = pathname.match(re);
      if (m)
        return { ...navloc, path, params: m.groups! };
    }
    return null;
  };

  const [parsedRoute, setParsedRoute] = observe<{ val: ParsedRoute }>({ val: makeNullParsedRoute() });

  autorun(() => {
    setParsedRoute(s => {
      s.val = matchPath(src.location()) || makeNullParsedRoute();
    });
  });

  return createSpecial((actx: AssembleContext, _props: {}) => {
    return dynamicFun(actx, {
      props: () => ({ ...parsedRoute.val, navigate: () => {} }),
      component: () => (
        (routes as unknown as RouteTable<string>)[parsedRoute.val.path] ||
        (() => `No route for "${parsedRoute.val.pathname}"`)
      )
    });
  });
}
