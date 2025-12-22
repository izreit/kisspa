import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createStore } from "../../reactive/index.js";
// biome-ignore lint/correctness/noUnusedImports: needed for JSX
import { h } from "../h.js";
import { createContext, createRoot, deprop, type JSX, type JSXNode, type JSXNodeAsync, type Prop, type Root, Suspense, useContext } from "../index.js";

describe("createContext()", () => {
  let elem: HTMLElement;
  let root: Root;

  beforeAll(() => {
    elem = document.createElement("div");
    root = createRoot(elem);
  });
  afterEach(() => {
    root.detach();
  });

  it("provides context", async () => {
    type TestContextValue = { x: () => number; };
    const TestContext = createContext<TestContextValue>({ x: () => 0 });
    const [store, setStore] = createStore({ x: 10 });

    function Comp0(_props: {}): JSXNode {
      const ctx = useContext(TestContext);
      return <div>{ctx.x}</div>;
    }

    root.attach(
      <TestContext.Provider value={{ x: () => store.x }}>
        <p>
          <Comp0 />
          <Comp0 />
        </p>
      </TestContext.Provider>
    );
    expect(elem.innerHTML).toBe("<p><div>10</div><div>10</div></p>");
    setStore(s => s.x++);
    expect(elem.innerHTML).toBe("<p><div>11</div><div>11</div></p>");
  });

  it("provides the initial value if Provider isn't used", async () => {
    type TestContextValue = { x: () => number; };
    const TestContext = createContext<TestContextValue>({ x: () => 0 });
    const [store, setStore] = createStore({ x: 10 });

    function Comp0(_props: {}): JSXNode {
      const ctx = useContext(TestContext);
      return <div>{ctx.x}</div>;
    }

    root.attach(
      <main>
        <Comp0 />
        <TestContext.Provider value={{ x: () => store.x }}>
          <p>
            <Comp0 />
          </p>
        </TestContext.Provider>
      </main>
    );
    expect(elem.innerHTML).toBe("<main><div>0</div><p><div>10</div></p></main>");
    setStore(s => s.x++);
    expect(elem.innerHTML).toBe("<main><div>0</div><p><div>11</div></p></main>");
  });

  it("can be used even in synchronous part of async functions", async () => {
    type TestContextValue = { x: () => number; };
    const TestContext = createContext<TestContextValue>({ x: () => 0 });
    const [store, setStore] = createStore({ x: 10 });

    async function Comp0(_props: {}): JSXNodeAsync {
      const ctx = useContext(TestContext);
      await new Promise(res => setTimeout(res, 1));
      return <div>{ctx.x}</div>;
    }

    const promiseAttach = root.attach(
      <main>
        <p>
          <Comp0 />
        </p>
        <TestContext.Provider value={{ x: () => store.x }}>
          <Comp0 />
        </TestContext.Provider>
      </main>
    );
    expect(elem.innerHTML).toBe("<main><p></p></main>");
    await promiseAttach;
    expect(elem.innerHTML).toBe("<main><p><div>0</div></p><div>10</div></main>");
    setStore(s => s.x++);
    expect(elem.innerHTML).toBe("<main><p><div>0</div></p><div>11</div></main>");
  });

  it("can be used even in asyncrounously rendered", async () => {
    type TestContextValue = { x: () => number; };
    const TestContext = createContext<TestContextValue>({ x: () => 0 });
    const [store, setStore] = createStore({ x: 10 });

    function Comp(_props: {}): JSX.Element {
      const ctx = useContext(TestContext);
      return <div>{ctx.x}</div>;
    }

    async function AsyncComp(_props: {}): JSXNodeAsync {
      await new Promise(res => setTimeout(res, 1));
      return <nav><Comp /></nav>;
    }

    const promiseAttach = root.attach(
      <main>
        <p>
          <AsyncComp />
        </p>
        <TestContext.Provider value={{ x: () => store.x }}>
          <AsyncComp />
        </TestContext.Provider>
      </main>
    );
    expect(elem.innerHTML).toBe("<main><p></p></main>");
    await promiseAttach;
    expect(elem.innerHTML).toBe("<main><p><nav><div>0</div></nav></p><nav><div>10</div></nav></main>");
    setStore(s => s.x++);
    expect(elem.innerHTML).toBe("<main><p><nav><div>0</div></nav></p><nav><div>11</div></nav></main>");
  });

  it("can be used even in suspensed and asyncrounously rendered", async () => {
    type TestContextValue = { x: () => number; };
    const TestContext = createContext<TestContextValue>({ x: () => 0 });
    const [store, setStore] = createStore({ x: 10 });

    function Comp(_props: {}): JSX.Element {
      const ctx = useContext(TestContext);
      return <div>{ctx.x}</div>;
    }

    async function AsyncComp(_props: {}): JSXNodeAsync {
      await new Promise(res => setTimeout(res, 1));
      return <nav><Comp />{new Promise(resolve => setTimeout(resolve, 1)).then(() => 3)}</nav>;
    }

    const promiseAttach = root.attach(
      <main>
        <p>
          <AsyncComp />
        </p>
        <Suspense>
          <TestContext.Provider value={{ x: () => store.x }}>
            <AsyncComp />
          </TestContext.Provider>
        </Suspense>
      </main>
    );
    expect(elem.innerHTML).toBe("<main><p></p></main>");
    await promiseAttach;
    expect(elem.innerHTML).toBe("<main><p><nav><div>0</div>3</nav></p></main>");
    await root.flush();
    expect(elem.innerHTML).toBe("<main><p><nav><div>0</div>3</nav></p><nav><div>10</div>3</nav></main>");
    setStore(s => s.x++);
    expect(elem.innerHTML).toBe("<main><p><nav><div>0</div>3</nav></p><nav><div>11</div>3</nav></main>");
  });

  it("can use multiple contexts", async () => {
    const ctx1 = createContext({ x: () => 0 as number });
    const ctx2 = createContext({ y: "foo" });
    const [store, setStore] = createStore({ x: 10 });

    function Comp12(props: { val: Prop<number> }) {
      const c1 = useContext(ctx1);
      const c2 = useContext(ctx2);
      return <div>{() => c1.x() + deprop(props.val)}, { c2.y }</div>
    }
    function Comp1(props: { val: Prop<number> }) {
      const c1 = useContext(ctx1);
      return <div>{() => c1.x() + deprop(props.val)}</div>
    }

    await root.attach(
      <main>
        <p>
          <Comp12 val={() => 100}/>
        </p>
        <ctx1.Provider value={{ x: () => store.x }}>
          <Comp12 val={4} />
          <Comp1 val={5} />
        </ctx1.Provider>
      </main>
    );

    expect(elem.innerHTML).toBe("<main><p><div>100, foo</div></p><div>14, foo</div><div>15</div></main>");
    setStore(s => s.x++);
    expect(elem.innerHTML).toBe("<main><p><div>100, foo</div></p><div>15, foo</div><div>16</div></main>");
  });
});
