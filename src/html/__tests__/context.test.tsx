import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { observe } from "../../reactive";
import { JSX, type JSXNode, type JSXNodeAsync, type Root, createContext, createRoot, h, withContext } from "../index";

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
    const [store, setStore] = observe({ x: 10 });

    const Comp0 = withContext(TestContext, ctx => (_props: {}): JSXNode => {
      return <div>{ctx.x}</div>;
    })

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
    const [store, setStore] = observe({ x: 10 });

    const Comp0 = withContext(TestContext, ctx => (_props: {}): JSXNode => {
      return <div>{ctx.x}</div>;
    });

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
    const [store, setStore] = observe({ x: 10 });

    const Comp0 = withContext(TestContext, ctx => async (_props: {}): JSXNodeAsync => {
      await new Promise(res => setTimeout(res, 1));
      return <div>{ctx.x}</div>;
    });

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
    const [store, setStore] = observe({ x: 10 });

    const Comp = withContext(TestContext, ctx => function Comp(_props: {}): JSX.Element {
      return <div>{ctx.x}</div>;
    });

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
});
