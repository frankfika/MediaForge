import { describe, expect, it } from "vitest";
import { mock } from "./llm";
import type { Source } from "./types";

const source: Source = { url: "https://example.com", title: "Example Domain", author: "", text: "这是第一句话。这是第二句话!Example domain for illustrative examples.", images: [], videos: [] };

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
