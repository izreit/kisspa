import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { observe } from "../../reactive/index.js";
import { type JSXNode, type JSXNodeAsync, type Root, Suspense, createRoot } from "../index.js";
import { h } from "../h.js";

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
});
