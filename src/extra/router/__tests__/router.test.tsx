import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createLogBuffer, createSeparatedPromise } from "../../../html/__tests__/testutil.js";
import { Fragment, h } from "../../../html/h.js";
import { type JSX, type JSXNode, type JSXNodeAsync, type JSXNodeAsyncValue, type PropChildren, type Root, Show, Suspense, createRef, createRoot, observe, onCleanup, onMount, useComponentMethods } from "../../../index-html.js";
import { createMemoryNavigateSource } from "../memsource.js";
import { createRouterComponent } from "../router.js";

describe("router", () => {
  let elem: HTMLElement;
  let root: Root;

  beforeAll(() => {
    elem = document.createElement("div");
    root = createRoot(elem);
  });
  afterEach(() => {
    root.detach();
  });

  it("can define routes", async () => {
    const navsrc = createMemoryNavigateSource();
    const Router = createRouterComponent(navsrc, {
      "/foo/:bar": (props) => <i>foo:{props.params.bar}</i>,
      "/zoo": (props) => <b>zoo:{props.path}</b>,
    });

    await root.attach(<Router />);
    expect(elem.innerHTML).toBe("No route for \"\"");
    navsrc.addState(true, {}, "", "/foo/123");
    expect(elem.innerHTML).toBe("<i>foo:123</i>");
    navsrc.addState(true, {}, "", "/zoo");
    expect(elem.innerHTML).toBe("<b>zoo:zoo</b>");
  });
});
