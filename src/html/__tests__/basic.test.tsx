import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { observe, signal } from "../../reactive/index.js";
import { type JSX, type JSXNode, type JSXNodeAsync, type JSXNodeAsyncValue, type Root, Suspense, createRef, createRoot, useComponentMethods } from "../index.js";
import { h } from "../h.js";
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
    const [store, setStore] = observe({ padding: 0 });

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
    expect(button.onclick).toBe(handleClick);
    expect(button.getAttribute("allowFullScreen")).toBe("true");
    expect(button.style.margin).toBe("10px");
    expect(button.style.paddingLeft).toBe("0px");
    button.click();
    expect(button.style.paddingLeft).toBe("1px");
  });

  it("can set/remove attrs", async () => {
    const ref = createRef<HTMLButtonElement>();
    const [className, setClassName] = signal<string | undefined>("foo");

    await root.attach(
      <button type="button" ref={ref} class={className} />
    );

    const button = ref.value!;
    expect(button.type).toBe("button");
    expect(button.className).toBe("foo");

    setClassName(undefined)
    expect(button.hasAttribute("className")).toBe(false);
  });

  it("can toggle attrs", async () => {
    const ref = createRef<HTMLButtonElement>();
    const [allowFullscreen, setAllowFullscreen] = signal<boolean | undefined>(true);

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

  it("can have a function returns JSX in attrs", async () => {
    interface CompProps {
      jsxattr: JSXNode;
    }
    function Comp(props: CompProps): JSX.Element {
      return <p>{ props.jsxattr }</p>;
    }
    const [store, setStore] = observe({ show: true });
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
    const [sig, setSig] = signal(10);
    await root.attach(<Foo x={sig} />);
    expect(elem.innerHTML).toBe("<div>10</div>");
    setSig(30);
    expect(elem.innerHTML).toBe("<div>30</div>");
  });

  describe("useComponentMethods()", () => {
    it("provides onMount, onCleanup, reaction", async () => {
      const { log, reap } = createLogBuffer();
      const promise = createSeparatedPromise();

      function Comp(props: { x: () => number }): JSX.Element {
        const { onMount, onCleanup, reaction } = useComponentMethods();

        let refp: HTMLParagraphElement;
        onMount(() => {
          log(`onmount ${refp?.innerHTML}`);

          onMount(() => {
            log("onmount-nested");

            promise.then(() => {
              log("onmount-async");
              reaction(() => log(`reaction ${props.x()}`));
              onCleanup(() => log("oncleanup-async"));
            });
          });
        });

        onCleanup(() => log("oncleanup"));

        return <p ref={(ref) => {refp = ref}}>{ props.x }</p>;
      }
      const [store, setStore] = observe({ value: 10 });

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
        "reaction 10",
      ]);

      setStore(s => s.value++);
      expect(reap()).toEqual([
        "reaction 11",
      ]);

      root.detach();
      expect(reap()).toEqual([
        "oncleanup-async",
        "oncleanup",
      ]);

      setStore(s => s.value++);
      expect(reap()).toEqual([]); // already detached: no reaction() run.
    });

    it("can be called twice", async () => {
      const { log, reap } = createLogBuffer();

      function Comp(props: { x: () => number }): JSX.Element {
        const { onMount, onCleanup, reaction } = useComponentMethods();
        const { onMount: onMount2, onCleanup: onCleanup2, reaction: reaction2 } = useComponentMethods();

        log(`onMount identical: ${onMount === onMount2}`);
        log(`onCleanup identical: ${onCleanup === onCleanup2}`);
        log(`reaction identical: ${reaction === reaction2}`);

        onMount(() => log("onmount"));
        onCleanup(() => log("oncleanup"));
        return <p>{ props.x }</p>;
      }

      const [store, _setStore] = observe({ value: 10 });
      await root.attach(
        <Comp x={() => store.value} />
      );

      expect(elem.innerHTML).toBe("<p>10</p>");
      expect(reap()).toEqual([
        "onMount identical: true",
        "onCleanup identical: true",
        "reaction identical: true",
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

      const [store, _setStore] = observe({ value: 10 });
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

      const [store, _setStore] = observe({ value: 10 });
      const promiseAttach = root.attach(<Root />);

      expect(elem.innerHTML).toBe("<div><i></i></div>");
      await promiseAttach;

      expect(elem.innerHTML).toBe("<div><p>10</p></div>");
      expect(reap()).toEqual([
        "onmount",
        "onmount-out",
      ]);

      root.detach();
      expect(reap()).toEqual([
        "oncleanup",
        "oncleanup-out",
      ]);
    });
  });
});
