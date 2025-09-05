import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createEffect, createSignal, createStore } from "../../reactive/index.js";
import { Fragment, h } from "../h.js";
import { type JSX, type JSXNode, type JSXNodeAsync, type JSXNodeAsyncValue, type PropChildren, type Root, Show, Suspense, createRef, createRoot, onCleanup, onMount, useComponentMethods } from "../index.js";
import { createLogBuffer, createSeparatedPromise } from "./testutil.js";

describe("basic", () => {
  let elem: HTMLElement;
  let root: Root;

  beforeAll(() => {
    elem = document.createElement("div");
    root = createRoot(elem);
  });
  afterEach(() => {
    root.detach();
  });

  it("can have static/dynamic attrs", async () => {
    const ref = createRef<HTMLButtonElement>();
    const [store, setStore] = createStore({ padding: 0 });

    function handleClick() {
      setStore(s => s.padding++);
    }

    await root.attach(
      <button type="button"
        ref={ref}
        id="foo"
        allowFullScreen={true}
        onClick={handleClick}
        style={{
          margin: "10px",
          paddingLeft: () => `${store.padding}px`,
        }}
      />
    );

    const button = ref.value!;
    expect(button.type).toBe("button");
    expect(button.id).toBe("foo");
    expect(button.getAttribute("allowFullScreen")).toBe("true");
    expect(button.style.margin).toBe("10px");
    expect(button.style.paddingLeft).toBe("0px");
    button.click();
    expect(button.style.paddingLeft).toBe("1px");

    root.detach();
    expect(ref.value).toBeNull();
  });

  it("can add event listeners with options - signal", async () => {
    const ref = createRef<HTMLButtonElement>();
    const [store, setStore] = createStore({ val: 0 });
    const ac = new AbortController();

    function handleClick() {
      setStore(s => s.val++);
    }

    await root.attach(
      <button
        type="button"
        ref={ref}
        onClick={[handleClick, { signal: ac.signal }]}
      />
    );

    const button = ref.value!;
    expect(store.val).toBe(0);
    button.click();
    expect(store.val).toBe(1);
    button.click();
    expect(store.val).toBe(2);

    ac.abort();
    button.click();
    expect(store.val).toBe(2);
  });

  it("can add event listeners with options - once", async () => {
    const ref = createRef<HTMLInputElement>();

    try {
      // In happy-dom, `focus()` dispatches `FocusEvent` only if the element is attached to document
      // while Web browsers seems not fire FocusEvent by `focus()` whether or not the element is attached.
      // ref. https://github.com/capricorn86/happy-dom/blob/e4fea234/packages/happy-dom/src/nodes/html-element/HTMLElementUtility.ts#L21
      elem.ownerDocument.body.appendChild(elem);

      let count = 0;
      await root.attach(
        <input
          type="text"
          ref={ref}
          value={""}
          onFocusIn={[() => ++count, { once: true }]}
        />
      );

      const el = ref.value!;
      el.focus();
      await Promise.resolve();
      expect(count).toBe(1);
      el.blur();
      el.focus();
      expect(count).toBe(1);

    } finally {
      elem.remove();
    }
  });

  it("can set/remove attrs", async () => {
    const ref = createRef<HTMLButtonElement>();
    const [className, setClassName] = createSignal<string | undefined>("foo");

    await root.attach(
      <button type="button" ref={ref} class={className} />
    );

    const button = ref.value!;
    expect(button.type).toBe("button");
    expect(button.className).toBe("foo");

    setClassName(undefined);
    expect(button.hasAttribute("className")).toBe(false);
  });

  it("takes care of non-reflecting attributes", async () => {
    const ref = createRef<HTMLInputElement>();
    const [val, setVal] = createSignal("initial");

    await root.attach(
      <input type="text" ref={ref} value={val} />
    );

    const el = ref.value!;
    expect(el.getAttribute("value")).toBeNull(); // not set by attribute
    expect(el.value).toBe("initial");

    setVal("altered");
    expect(el.getAttribute("value")).toBeNull();
    expect(el.value).toBe("altered");
  });

  it("can toggle attrs", async () => {
    const ref = createRef<HTMLButtonElement>();
    const [allowFullscreen, setAllowFullscreen] = createSignal<boolean | undefined>(true);

    await root.attach(
      <button type="button" ref={ref} allowFullScreen={allowFullscreen} />
    );

    const button = ref.value!;
    expect(button.type).toBe("button");
    expect(button.getAttribute("allowFullScreen")).toBe("true");

    setAllowFullscreen(undefined);
    expect(button.hasAttribute("allowFullScreen")).toBe(false);
  });

  it("can have JSX in attrs", async () => {
    interface CompProps {
      jsxattr: JSXNode;
    }
    function Comp(props: CompProps): JSX.Element {
      return <p>{ props.jsxattr }</p>;
    }
    await root.attach(
      <Comp jsxattr={<span>foo</span>} />
    );
    expect(elem.innerHTML).toBe("<p><span>foo</span></p>");
  });

  it("can have various values in attrs", async () => {
    function Comp(props: { children: PropChildren }): JSX.Element {
      return <p>{ props.children }<i>zzz</i></p>;
    }
    await root.attach(<>
      <Comp><span>first</span></Comp>
      <Comp>bee<span>second</span>zoo</Comp>
      <Comp>{ 21 * 2 }</Comp>
      <Comp>{ "Foo".repeat(2) }</Comp>
      <Comp>{ null }</Comp>
      <Comp>{ undefined }</Comp>
    </>);
    expect(elem.innerHTML).toBe([
      "<p><span>first</span><i>zzz</i></p>",
      "<p>bee<span>second</span>zoo<i>zzz</i></p>",
      "<p>42<i>zzz</i></p>",
      "<p>FooFoo<i>zzz</i></p>",
      "<p><i>zzz</i></p>",
      "<p><i>zzz</i></p>",
    ].join(""));
  });

  it("can have a function returns JSX in attrs", async () => {
    interface CompProps {
      jsxattr: JSXNode;
    }
    function Comp(props: CompProps): JSX.Element {
      return <p>{ props.jsxattr }</p>;
    }
    const [store, setStore] = createStore({ show: true });
    await root.attach(
      <Comp jsxattr={() => store.show ? <span>foo</span> : <i/>} />
    );
    expect(elem.innerHTML).toBe("<p><span>foo</span></p>");
    setStore(s => s.show = false);
    expect(elem.innerHTML).toBe("<p><i></i></p>");
  });

  it("can have import() in component", async () => {
    async function Foo(props: { x: () => number }): Promise<JSXNodeAsyncValue> {
      const { FixtureComponent } = await import("./fixtures/FixtureComponent");
      return <FixtureComponent value={props.x} />
    }
    const [sig, setSig] = createSignal(10);
    await root.attach(<Foo x={sig} />);
    expect(elem.innerHTML).toBe("<div>10</div>");
    setSig(30);
    expect(elem.innerHTML).toBe("<div>30</div>");
  });

  describe("useComponentMethods()", () => {
    it("provides onMount, onCleanup", async () => {
      const { log, reap } = createLogBuffer();
      const promise = createSeparatedPromise();

      function Comp(props: { x: () => number }): JSX.Element {
        const { onMount, onCleanup } = useComponentMethods();

        let refp: HTMLParagraphElement;
        onMount(() => {
          log(`onmount ${refp?.innerHTML}`);

          onMount(() => {
            log("onmount-nested");

            promise.then(() => {
              log("onmount-async");
              onCleanup(createEffect(() => log(`effect ${props.x()}`)));
              onCleanup(() => log("oncleanup-async"));
            });
          });
        });

        onCleanup(() => log("oncleanup"));

        return <p ref={(ref) => {refp = ref}}>{ props.x }</p>;
      }
      const [store, setStore] = createStore({ value: 10 });

      await root.attach(
        <Comp x={() => store.value} />
      );
      expect(elem.innerHTML).toBe("<p>10</p>");
      expect(reap()).toEqual([
        "onmount 10",
        "onmount-nested",
      ]);

      await promise.resolve();
      expect(reap()).toEqual([
        "onmount-async",
        "effect 10",
      ]);

      setStore(s => s.value++);
      expect(reap()).toEqual([
        "effect 11",
      ]);

      root.detach();
      expect(reap()).toEqual([
        "oncleanup-async",
        "oncleanup",
      ]);

      setStore(s => s.value++);
      expect(reap()).toEqual([]); // already detached: no effect run.
    });

    it("can be called twice", async () => {
      const { log, reap } = createLogBuffer();

      function Comp(props: { x: () => number }): JSX.Element {
        const { onMount, onCleanup } = useComponentMethods();
        const { onMount: onMount2, onCleanup: onCleanup2 } = useComponentMethods();

        log(`onMount identical: ${onMount === onMount2}`);
        log(`onCleanup identical: ${onCleanup === onCleanup2}`);

        onMount(() => log("onmount"));
        onCleanup(() => log("oncleanup"));
        return <p>{ props.x }</p>;
      }

      const [store, _setStore] = createStore({ value: 10 });
      await root.attach(
        <Comp x={() => store.value} />
      );

      expect(elem.innerHTML).toBe("<p>10</p>");
      expect(reap()).toEqual([
        "onMount identical: true",
        "onCleanup identical: true",
        "onmount",
      ]);

      root.detach();
      expect(reap()).toEqual([
        "oncleanup",
      ]);
    });

    it("can be called after async context", async () => {
      const { log, reap } = createLogBuffer();

      async function Comp(props: { x: () => number }): JSXNodeAsync {
        const { onMount, onCleanup } = useComponentMethods();

        onMount(() => log("onmount1"));
        onCleanup(() => log("oncleanup1"));
        await Promise.resolve();
        onMount(() => log("onmount2"));
        onCleanup(() => log("oncleanup2"));
        return <p>{ props.x }</p>;
      }

      const [store, _setStore] = createStore({ value: 10 });
      const promiseAttach = root.attach(
        <div><Comp x={() => store.value} /></div>
      );

      expect(elem.innerHTML).toBe("<div></div>");
      await promiseAttach;

      expect(elem.innerHTML).toBe("<div><p>10</p></div>");
      expect(reap()).toEqual([
        "onmount1",
        "onmount2",
      ]);

      root.detach();
      expect(reap()).toEqual([
        "oncleanup2",
        "oncleanup1",
      ]);
    });

    it("can be called inside Suspense", async () => {
      const { log, reap } = createLogBuffer();

      async function Comp(props: { x: () => number }): JSXNodeAsync {
        const { onMount, onCleanup } = useComponentMethods();
        await Promise.resolve();
        onMount(() => log("onmount"));
        onCleanup(() => log("oncleanup"));
        return <p>{ props.x }</p>;
      }

      function Root() {
        const { onMount, onCleanup } = useComponentMethods();
        onMount(() => log("onmount-out"));
        onCleanup(() => log("oncleanup-out"));
        return (
          <div>
            <Suspense fallback={<i />}>
              <Comp x={() => store.value} />
            </Suspense>
          </div>
        );
      }

      const [store, _setStore] = createStore({ value: 10 });
      const attachPromise = root.attach(<Root />);

      expect(reap()).toEqual([]);
      expect(elem.innerHTML).toBe("<div><i></i></div>");

      await attachPromise;
      expect(reap()).toEqual(["onmount-out"]);

      await root.flush();
      expect(elem.innerHTML).toBe("<div><p>10</p></div>");
      expect(reap()).toEqual(["onmount"]);

      root.detach();
      expect(reap()).toEqual([
        "oncleanup",
        "oncleanup-out",
      ]);
    });

    it("doesn't reproduce a bug in commit aacfaee (regression)", async () => {
      const { log, reap } = createLogBuffer();
      const [store, setStore] = createStore({ x: 10 });

      function Comp0(_props: {}): JSXNode {
        return <b>{() => store.x}</b>;
      }

      function Comp1(_props: {}): JSXNode {
        onMount(() => log("mount1"));
        return <i/>;
      }

      const attachPromise = root.attach(
        <p>
          <Comp0 />{/* this caused nested assemble and reset actx stack in aacfaee */}
          <Comp1 />{/* and then onMount() in this caused crash */}
        </p>
      );
      expect(elem.innerHTML).toBe("<p><b>10</b><i></i></p>");
      expect(reap()).toEqual([]);
      await attachPromise;

      expect(reap()).toEqual(["mount1"]);
      setStore(s => s.x++);
      expect(elem.innerHTML).toBe("<p><b>11</b><i></i></p>");
      expect(reap()).toEqual([]);
    });

    it("doen't call neither onMount nor onCleanup handlers until the promise is settled", async () => {
      const { log, reap } = createLogBuffer();
      const [showing, setShowing] = createSignal(true);

      async function Comp(): JSXNodeAsync {
        onMount(() => log("mount"));
        onCleanup(() => log("unmount"));
        await new Promise(() => {}); // never settled
        return <b/>;
      }

      root.attach( // must not await this since it's never settled
        <Show when={showing}>
          <Comp />
        </Show>
      );
      await new Promise(resolve => setTimeout(resolve, 1)); // instead of awaiting attach(). may not be needed.

      expect(reap()).toEqual([]);
      setShowing(false);
      expect(reap()).toEqual([]);
    });
  });
});
