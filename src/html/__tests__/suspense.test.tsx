import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { observe } from "../../reactive/index.js";
import { h } from "../h.js";
import { type JSXNode, type JSXNodeAsync, type Prop, type Root, Suspense, createRoot, onCleanup, onMount } from "../index.js";
import { createLogBuffer, createSeparatedPromise } from "./testutil.js";

describe("Suspense", () => {
  let elem: HTMLElement;
  let root: Root;

  beforeAll(() => {
    elem = document.createElement("div");
    root = createRoot(elem);
  });
  afterEach(() => {
    root.detach();
  });

  it("waits a Promise in JSX", async () => {
    function WrapWithPromise(props: { val: () => number }) {
      return <p>(Async) {new Promise(resolve => setTimeout(resolve, 1)).then(() => props.val)}</p>;
    }

    const [store, setStore] = observe({ foo: 0 });
    const promiseAttach = root.attach(
      <div>
        (Sync)
        <Suspense>
          <WrapWithPromise val={() => store.foo} />
        </Suspense>
      </div>
    );
    expect(elem.innerHTML).toBe("<div>(Sync)</div>");

    setStore(s => s.foo++);
    await promiseAttach;
    expect(elem.innerHTML).toBe("<div>(Sync)</div>");
    await root.flush();
    expect(elem.innerHTML).toBe("<div>(Sync)<p>(Async) 1</p></div>");
  });

  it("waits an async function (component)", async () => {
    // There are two promises for a promise in JSX returned by async function.
    async function AsyncComp(props: { val: () => number }) {
      return <p>(Async) {() => props.val}</p>;
    }

    const [store, setStore] = observe({ foo: 0 });
    const promiseAttach = root.attach(
      <div>
        (Sync)
        <Suspense>
          <AsyncComp val={() => store.foo} />
        </Suspense>
      </div>
    );
    expect(elem.innerHTML).toBe("<div>(Sync)</div>");

    setStore(s => s.foo++);
    await promiseAttach;
    expect(elem.innerHTML).toBe("<div>(Sync)</div>");
    await root.flush();
    expect(elem.innerHTML).toBe("<div>(Sync)<p>(Async) 1</p></div>");
  });

  it("waits a Promise from an async function (component)", async () => {
    // There are two promises for a promise in JSX returned by async function.
    async function PromiseFromAsyncComp(props: { val: () => number }) {
      return <p>(Async) {new Promise(resolve => setTimeout(resolve, 1)).then(() => props.val)}</p>;
    }

    const [store, setStore] = observe({ foo: 0 });
    const promiseAttach = root.attach(
      <div>
        (Sync)
        <Suspense>
          <PromiseFromAsyncComp val={() => store.foo} />
        </Suspense>
      </div>
    );
    expect(elem.innerHTML).toBe("<div>(Sync)</div>");

    setStore(s => s.foo++);
    await promiseAttach;
    expect(elem.innerHTML).toBe("<div>(Sync)</div>");
    await root.flush();
    expect(elem.innerHTML).toBe("<div>(Sync)<p>(Async) 1</p></div>");
  });

  it("shows fallback until resolved", async () => {
    async function AsyncComp(props: { val: () => number }) {
      return <p>(Async) {() => props.val}</p>;
    }

    const [store, setStore] = observe({ foo: 0 });
    const promiseAttach = root.attach(
      <div>
        (Sync)
        <Suspense fallback={<span>loading...</span>}>
          <AsyncComp val={() => store.foo} />
        </Suspense>
      </div>
    );
    expect(elem.innerHTML).toBe("<div>(Sync)<span>loading...</span></div>");

    await promiseAttach;
    setStore(s => s.foo++);
    expect(elem.innerHTML).toBe("<div>(Sync)<span>loading...</span></div>");
    await root.flush();
    expect(elem.innerHTML).toBe("<div>(Sync)<p>(Async) 1</p></div>");
  });

  it("blocks error from async function", async () => {
    async function AsyncErrorComp(_props: { val: () => number }): JSXNodeAsync {
      throw new Error("intentional");
    }

    const [store, _setStore] = observe({ foo: 0 });
    const promiseAttach = root.attach(
      <div>
        (Sync)
        <Suspense fallback={<span>loading...</span>}>
          <AsyncErrorComp val={() => store.foo} />
        </Suspense>
      </div>
    );
    expect(elem.innerHTML).toBe("<div>(Sync)<span>loading...</span></div>");
    await promiseAttach;
    expect(elem.innerHTML).toBe("<div>(Sync)<span>loading...</span></div>");
    await root.flush();
    expect(elem.innerHTML).toBe("<div>(Sync)</div>");
  });

  it("blocks error from rejected promise in JSX", async () => {
    async function AsyncErrorComp(_props: { val: () => number }): JSXNodeAsync {
      return <div>{() => Promise.reject<string>(new Error("intentional"))}</div>;
    }

    const [store, _setStore] = observe({ foo: 0 });
    const promiseAttach = root.attach(
      <div>
        (Sync)
        <Suspense fallback={<span>loading...</span>}>
          <AsyncErrorComp val={() => store.foo} />
        </Suspense>
      </div>
    );
    expect(elem.innerHTML).toBe("<div>(Sync)<span>loading...</span></div>");
    await promiseAttach;
    expect(elem.innerHTML).toBe("<div>(Sync)<span>loading...</span></div>");
    await root.flush();
    expect(elem.innerHTML).toBe("<div>(Sync)</div>");
  });

  it("blocks synchonous error", async () => {
    function SyncErrorComp(_props: { val: () => number }): JSXNode {
      throw new Error("intentional");
    }

    const [store, _setStore] = observe({ foo: 0 });
    const promiseAttach = root.attach(
      <div>
        (Sync)
        <Suspense
          fallback={<span>loading...</span>}
          errorFallback={<span>fail</span>}
        >
          <SyncErrorComp val={() => store.foo} />
        </Suspense>
      </div>
    );
    expect(elem.innerHTML).toBe("<div>(Sync)<span>fail</span></div>");
    await promiseAttach;
    expect(elem.innerHTML).toBe("<div>(Sync)<span>fail</span></div>");
  });

  it("shows errorFallback while error", async () => {
    async function AsyncErrorComp(_props: { val: () => number }): JSXNodeAsync {
      throw new Error("intentional");
    }

    const [store, _setStore] = observe({ foo: 0 });
    const promiseAttach = root.attach(
      <div>
        (Sync)
        <Suspense
          fallback={<span>loading...</span>}
          errorFallback={"error"}
        >
          <AsyncErrorComp val={() => store.foo} />
        </Suspense>
      </div>
    );
    expect(elem.innerHTML).toBe("<div>(Sync)<span>loading...</span></div>");
    await promiseAttach;
    expect(elem.innerHTML).toBe("<div>(Sync)<span>loading...</span></div>");
    await root.flush();
    expect(elem.innerHTML).toBe("<div>(Sync)error</div>");
  });

  it("is OK if no promise", async () => {
    const [store, _setStore] = observe({ foo: 0 });
    const promiseAttach = root.attach(
      <div>
        (Sync)
        <Suspense fallback={<span>loading...</span>}>
          <div>{() => store.foo}</div>
        </Suspense>
      </div>
    );
    expect(elem.innerHTML).toBe("<div>(Sync)<div>0</div></div>");
    await promiseAttach;
    expect(elem.innerHTML).toBe("<div>(Sync)<div>0</div></div>");
  });

  it("evaluates fallback only once even if there are multiple promises (regression)", async () => {
    let count = 0;
    function Fallback() {
      ++count;
      return <i>fallback</i>;
    }

    async function MultiPromise() {
      await Promise.resolve();
      return <div>
        <h1>{Promise.resolve().then(() => <main />)}</h1>
        <h2>{Promise.resolve().then(() => <sub />)}</h2>
        <h3>{Promise.resolve().then(() => <footer />)}</h3>
      </div>;
    }

    const promiseAttach = root.attach(
      <Suspense fallback={<Fallback />}>
        <MultiPromise />
      </Suspense>
    );

    expect(elem.innerHTML).toBe("<i>fallback</i>");
    expect(count).toEqual(1);
    count = 0;
    await promiseAttach;
    expect(elem.innerHTML).toBe("<i>fallback</i>");
    await root.flush();
    expect(elem.innerHTML).toBe("<div><h1><main></main></h1><h2><sub></sub></h2><h3><footer></footer></h3></div>");
    expect(count).toEqual(0); // this was 3 as of v0.12.1, corresponding 3 Promises written in JSX.
  });

  it("mounts and diposes the fallbacks", async () => {
    const { log, reap } = createLogBuffer();

    function Print({ val }: { val: string }) {
      onMount(() => log(`mount:${val}`));
      onCleanup(() => log(`unmount:${val}`));
      return <i>{val}</i>;
    }

    function Pending(props: { content: Prop<Promise<string>>, onGotRestart: (restart: () => void) => void }) {
      return <div>
        <Suspense
          fallback={<Print val="FB" />}
          errorFallback={(_err, restart) => {
            props.onGotRestart(restart);
            return <Print val="EF" />;
          }}
        >
          <b>{props.content}</b>
        </Suspense>
      </div>;
    }

    let restart: (() => void) | null = null;
    const manualPromise1 = createSeparatedPromise<string>();

    const contentFun = (): Promise<string> => {
      return restart ? Promise.resolve("mustsuccess") : manualPromise1;
    }

    await root.attach(<Pending content={contentFun} onGotRestart={r => { restart = r; }}/>);

    expect(elem.innerHTML).toBe("<div><i>FB</i></div>");
    expect(reap()).toEqual(["mount:FB"]);

    // Rejct a promise returned by contentFun() to test `errorCallback`.
    manualPromise1.reject(new Error("INTENTIONAL"));
    await root.flush();
    expect(reap()).toEqual(["unmount:FB", "mount:EF"]);
    expect(elem.innerHTML).toBe("<div><i>EF</i></div>");

    // Once `restart` is set, `contentFun()` in this test returns a resolved promise and
    // then `restart()` makes `<Suspense/>` settled successfuly.
    restart!();
    await root.flush();
    expect(reap()).toEqual(["unmount:EF", "mount:FB", "unmount:FB"]);
    expect(elem.innerHTML).toBe("<div><b>mustsuccess</b></div>");
  });

  it("doesn't call onCleanup handlers when disposed while waiting promises to fire onMount", async () => {
    const { log, reap } = createLogBuffer();

    function Comp(props: { promise: Promise<string> }) {
      onMount(() => log("mount"));
      onCleanup(() => log("unmount"));
      return <b>{props.promise}</b>;
    }

    const manualPromise = createSeparatedPromise<string>();
    root.attach(<Comp promise={manualPromise} />);
    expect(elem.innerHTML).toBe("<b></b>");
    expect(reap()).toEqual([]);

    root.detach(); // process onCleanup() handler (but don't call them since onMount() is not processed)
    manualPromise.resolve("foo"); // and then resolving the promise unlocks the promise to process onMount()
    await new Promise(res => setTimeout(res, 1)); // wait async to kick the promise to process onMount() actually
    expect(reap()).toEqual([]); // and still onMount() hanlders must not called since it's already disposed
  });
});
