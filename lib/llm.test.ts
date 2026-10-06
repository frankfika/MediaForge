import { describe, expect, it, vi } from "vitest";
import { mock } from "./llm";
import type { Source } from "./types";

const source: Source = {
  url: "https://example.com",
  title: "Example Domain",
  author: "",
  text: "这是第一句话。这是第二句话!Example domain for illustrative examples.",
  images: [],
  videos: [],
};

describe("mock llm", () => {
  it("rewrite is deterministic", async () => {
    const args = { source, platforms: ["wechat", "x", "xhs", "bilibili"] as const };
    const a = await mock.rewrite({ ...args, platforms: [...args.platforms] });
    const b = await mock.rewrite({ ...args, platforms: [...args.platforms] });
    expect(a).toEqual(b);
    expect(a.posts).toHaveLength(4);
  });
  it("learnStyle returns features", async () => {
    const p = await mock.learnStyle(["短句。再来一句?好。"]);
    expect(p.features.avgSentenceLength).toBeGreaterThan(0);
    expect(p.features).toHaveProperty("vocabulary");
    expect(p.prompt).not.toBe("");
  });
  it("refineStyle throws without feedback", async () => {
    const style = { id: "1", name: "s", prompt: "p", version: 1 };
    await expect(mock.refineStyle({ style })).rejects.toThrow();
    await expect(mock.refineStyle({ style, feedback: "更短" })).resolves.toHaveProperty("changelog");
  });
});

describe("llm seam", () => {
  const style = { id: "1", name: "s", prompt: "p", version: 1 };
  it("compose: markdown by default, clipped for x, falls back without references", async () => {
    const md = await mock.compose({ topic: "AI", references: [source] });
    expect(md).toMatch(/^# AI\n/);
    expect(md).toContain("这是第一句话");
    expect(await mock.compose({ topic: "AI" })).toContain("围绕「AI」");
    const x = await mock.compose({ topic: "AI", platform: "x", references: [{ ...source, text: "长".repeat(500) }] });
    expect(x.length).toBeLessThanOrEqual(280);
    expect(await mock.compose({ topic: "AI", platform: "x" })).toContain("值得展开");
  });
  it("learnStyle handles empty samples and detects devices / rhythm", async () => {
    const e = await mock.learnStyle([]);
    expect(e.features.avgSentenceLength).toBe(0);
    expect(e.features.devices).toEqual([]);
    const long = await mock.learnStyle(["- 列表项?他说“你好" + "字".repeat(120)]);
    expect(long.features.devices).toEqual(expect.arrayContaining(["rhetorical questions", "lists", "quotations"]));
    expect(long.features.rhythm).toContain("long");
  });
  it("refineStyle diff direction", async () => {
    const merged = await mock.refineStyle({ style, original: "一。二。三。", edited: "一二三。" });
    expect(merged.prompt).toContain("merge and shorten");
    expect((await mock.refineStyle({ style, original: "一。", edited: "一。二。" })).prompt).toContain("split");
    expect((await mock.refineStyle({ style, original: "一。", edited: "二。" })).prompt).toContain("reword");
  });
  it("rewrite adds instruction note and per-platform fields", async () => {
    const r = await mock.rewrite({ source, platforms: ["x", "xhs", "wechat", "bilibili"], instruction: "更短" });
    expect(r.posts.find((p) => p.platform === "wechat")!.body).toContain("(更短)");
    expect(r.posts.find((p) => p.platform === "bilibili")!.title).toMatch(/^【/);
  });
  it("llmMode / dispatch follow ANTHROPIC_API_KEY", async () => {
    vi.resetModules();
    const aiMock = { compose: vi.fn().mockResolvedValue("real"), rewrite: vi.fn(), learnStyle: vi.fn(), refineStyle: vi.fn() };
    vi.doMock("./ai", () => aiMock);
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const m1 = await import("./llm");
    expect(m1.llmMode()).toBe("mock");
    expect(await m1.compose({ topic: "t" })).toContain("# t");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-x");
    expect(m1.llmMode()).toBe("anthropic");
    expect(await m1.compose({ topic: "t" })).toBe("real");
    await m1.rewrite({ source, platforms: ["x"] });
    await m1.learnStyle(["a"]);
    await m1.refineStyle({ style, feedback: "f" });
    expect(aiMock.rewrite).toHaveBeenCalled();
    expect(aiMock.learnStyle).toHaveBeenCalled();
    expect(aiMock.refineStyle).toHaveBeenCalled();
    vi.unstubAllEnvs();
    vi.doUnmock("./ai");
  });

  it("take: stops at limit, clips a single oversized sentence; no hashtag when text has no words", async () => {
    const x = (text: string) => mock.rewrite({ source: { ...source, text }, platforms: ["x"] }).then((r) => r.posts[0]!.body);
    expect(await x("短句。" + "长".repeat(300) + "。")).not.toContain("长".repeat(50));
    expect(await x("长".repeat(300))).toContain("…");
    expect(await x("1 2 3。")).not.toContain("#");
  });
  it("learnStyle: identical-word samples give one vocabulary entry; medium rhythm", async () => {
    const p = await mock.learnStyle(["苹果苹果。", "苹果苹果。"]);
    expect(p.features.vocabulary).toEqual(["苹果苹果"]);
    expect((await mock.learnStyle(["字".repeat(30) + "。"])).features.rhythm).toContain("medium");
  });
  it("refineStyle: feedback + original/edited both land in rules", async () => {
    const r = await mock.refineStyle({ style, feedback: "更短", original: "一。二。", edited: "一。" });
    expect(r.changelog).toHaveLength(2);
    expect(r.prompt).toContain("User feedback: 更短");
    expect(r.prompt).toContain("merge and shorten");
  });
  it("seam dispatches to mock without a key", async () => {
    vi.resetModules();
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const m = await import("./llm");
    expect((await m.rewrite({ source, platforms: ["x"] })).posts).toHaveLength(1);
    expect((await m.learnStyle(["a。"])).prompt).not.toBe("");
    expect(await m.refineStyle({ style, feedback: "f" })).toHaveProperty("changelog");
  });
});
