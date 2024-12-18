import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { observe } from "../../reactive";
import { type JSXNode, type JSXNodeAsync, type Root, createContext, createRoot, h } from "../index";

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

    function Comp0(_props: {}): JSXNode {
      const ctx = TestContext.use();
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
    const [store, setStore] = observe({ x: 10 });

    function Comp0(_props: {}): JSXNode {
      const ctx = TestContext.use();
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
    const [store, setStore] = observe({ x: 10 });

    async function Comp0(_props: {}): JSXNodeAsync {
      const ctx = TestContext.use();
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
});
