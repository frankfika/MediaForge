import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMessage = vi.fn();
let chat: { messages: unknown[]; status: string; error?: Error };
vi.mock("@ai-sdk/react", () => ({ useChat: () => ({ ...chat, sendMessage }) }));

// happy-dom's Web Animations cancel() rejects with AbortError on unmount; render motion.* as plain elements
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

import { Chat } from "./chat";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLElement;
let root: Root;
const render = async (variant?: "page" | "drawer") => {
  await act(async () => root.render(<Chat variant={variant} />));
};
const button = (re: RegExp) => [...host.querySelectorAll("button")].find((b) => re.test(b.textContent ?? ""))!;
const textarea = () => host.querySelector("textarea")!;
const type = async (value: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea(), value);
    textarea().dispatchEvent(new Event("input", { bubbles: true }));
  });
const press = async (init: KeyboardEventInit) =>
  act(async () => void textarea().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, ...init })));

const source = { url: "https://example.com", title: "Example Domain", author: "a", text: "t", images: [], videos: [] };
const rewrite = { media: { images: [], videos: [] }, posts: [{ platform: "x", body: "hello x" }] };

beforeEach(() => {
  chat = { messages: [], status: "ready" };
  sendMessage.mockReset();
  localStorage.clear();
  host = document.body.appendChild(document.createElement("div"));
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("Chat", () => {
  it("empty state: welcome, 3 chips, demo button", async () => {
    await render();
    expect(host.textContent).toContain("今天想发点什么?");
    expect(host.textContent).toContain("尚未选择风格");
    expect(button(/试一下/)).toBeTruthy();
    expect(host.querySelectorAll("button.rounded-full")).toHaveLength(3);
  });

  it("chip shows the label but fills the query into the textarea", async () => {
    await render();
    const chip = button(/粘贴一条推文/);
    expect(chip.textContent).toContain("粘贴一条推文");
    await act(async () => chip.click());
    expect(textarea().value).toBe("把 https://example.com 改写成小红书风格");
    expect(textarea().value).not.toContain("我来改写");
  });

  it("试一下 posts to /api/rewrite and shows SourceCard", async () => {
    const fetchMock = vi.fn(async () => Response.json({ source, ...rewrite }));
    vi.stubGlobal("fetch", fetchMock);
    await render();
    await act(async () => button(/试一下/).click());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/rewrite");
    expect(JSON.parse(init.body as string)).toMatchObject({ url: "https://example.com" });
    expect(host.textContent).toContain("Example Domain");
    expect(host.textContent).not.toContain("今天想发点什么?");
  });

  it("试一下 failure shows the error", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ error: "boom" }, { status: 500 }));
    await render();
    await act(async () => button(/试一下/).click());
    expect(host.textContent).toContain("boom");
  });

  it("试一下 non-Error rejection falls back to 失败了", async () => {
    vi.stubGlobal("fetch", () => Promise.reject("nope"));
    await render();
    await act(async () => button(/试一下/).click());
    expect(host.textContent).toContain("失败了");
  });

  it("variant drawer vs page", async () => {
    await render("drawer");
    expect(host.firstElementChild!.className).toContain("min-h-full");
    expect(host.querySelector("form")!.className).toContain("sticky");
    await render("page");
    expect(host.firstElementChild!.className).not.toContain("min-h-full");
    expect(host.querySelector("form")!.className).toContain("fixed");
  });

  it("Enter sends and clears; Shift+Enter does not", async () => {
    await render();
    await type("hi there");
    await press({ shiftKey: true });
    expect(sendMessage).not.toHaveBeenCalled();
    await press({});
    expect(sendMessage).toHaveBeenCalledWith({ text: "hi there" }, { body: expect.objectContaining({ style: null }) });
    expect(textarea().value).toBe("");
  });

  it("submit button sends via the form's onSubmit", async () => {
    await render();
    await type("hello submit");
    await act(async () => host.querySelector<HTMLButtonElement>("button[type=submit]")!.click());
    expect(sendMessage).toHaveBeenCalledWith({ text: "hello submit" }, { body: expect.objectContaining({ style: null }) });
    expect(textarea().value).toBe("");
  });

  it("blank input or busy status never sends", async () => {
    await render();
    await type("   ");
    await press({});
    chat.status = "streaming";
    await render();
    await type("x");
    await press({});
    expect(sendMessage).not.toHaveBeenCalled();
    expect(host.querySelector<HTMLButtonElement>("button[type=submit]")!.disabled).toBe(true);
  });

  it("renders messages and tool states", async () => {
    chat = {
      status: "ready",
      error: new Error("kaput"),
      messages: [
        { id: "1", role: "user", parts: [{ type: "text", text: "my question" }] },
        {
          id: "2",
          role: "assistant",
          parts: [
            { type: "text", text: "answer" },
            { type: "tool-fetch_link", state: "output-available", output: source },
            { type: "tool-fetch_link", state: "output-error", errorText: "e1" },
            { type: "tool-fetch_link", state: "input-available" },
            { type: "tool-rewrite_post", state: "output-available", output: rewrite },
            { type: "tool-rewrite_post", state: "output-error", errorText: "e2" },
            { type: "tool-rewrite_post", state: "input-available" },
            { type: "step-start" },
          ],
        },
      ],
    };
    await render();
    for (const t of [
      "my question",
      "answer",
      "Example Domain",
      "抓取失败:e1",
      "正在抓取链接…",
      "hello x",
      "改写失败:e2",
      "正在改写…",
      "kaput",
    ])
      expect(host.textContent).toContain(t);
    expect(host.textContent).not.toContain("今天想发点什么?");
  });

  it("shows 思考中 while submitted after a user message", async () => {
    chat = { status: "submitted", messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "q" }] }] };
    await render();
    expect(host.textContent).toContain("思考中…");
  });
});
