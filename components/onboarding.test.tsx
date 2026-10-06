import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", () => ({
  motion: new Proxy(
    {},
    {
      get: (_, tag: string) =>
        function Plain(props: Record<string, unknown>) {
          return createElement(tag, Object.fromEntries(Object.entries(props).filter(([k]) => k !== "initial" && k !== "animate")));
        },
    },
  ),
}));

import { Onboarding } from "./onboarding";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLElement;
let root: Root;
const render = async () => {
  await act(async () => root.render(<Onboarding />));
};
const card = () => host.querySelector("[data-testid=onboarding]");
const links = () => [...host.querySelectorAll("a")].map((a) => a.getAttribute("href"));

beforeEach(() => {
  localStorage.clear();
  host = document.body.appendChild(document.createElement("div"));
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

describe("Onboarding", () => {
  it("shows the card on first visit", async () => {
    await render();
    expect(card()).toBeTruthy();
    expect(host.textContent).toContain("欢迎使用 MediaForge!");
    expect(host.textContent).toContain("三个步骤立刻开始");
  });

  it("dismiss sets the flag and hides the card", async () => {
    await render();
    const btn = [...host.querySelectorAll("button")].find((b) => b.textContent === "我知道了")!;
    await act(async () => btn.click());
    expect(localStorage.getItem("mediaforge.visited")).toBe("true");
    expect(card()).toBeNull();
  });

  it("stays hidden on second visit", async () => {
    localStorage.setItem("mediaforge.visited", "true");
    await render();
    expect(card()).toBeNull();
  });

  it("renders the 4 step links", async () => {
    await render();
    expect(links()).toEqual(["/styles", "/search", "/showcase", "/docs/mcp.md"]);
    expect(host.textContent).toContain("加载演示风格");
    expect(host.textContent).toContain("试试语义搜索");
    expect(host.textContent).toContain("看组件预览");
    expect(host.textContent).toContain("接 MCP server");
  });
});
