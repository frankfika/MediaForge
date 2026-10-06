import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateObject, generateText, anthropic } = vi.hoisted(() => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  anthropic: vi.fn((id: string) => ({ id })),
}));
vi.mock("ai", () => ({ generateObject, generateText }));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic }));

import { compose, learnStyle, model, refineStyle, rewrite, styleSystem } from "./ai";
import type { Source } from "./types";

const source: Source = { url: "https://e.com", title: "T", author: "A", text: "x".repeat(20_000), images: ["i.png"], videos: ["v.mp4"] };
const style = { id: "1", name: "S", prompt: "be terse", version: 1 };
const lastCall = (fn: typeof generateObject) => fn.mock.calls.at(-1)![0] as { prompt: string; system: string };

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe("model / styleSystem", () => {
  it("defaults the model id and honors ANTHROPIC_MODEL", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "");
    delete process.env.ANTHROPIC_MODEL;
    model();
    expect(anthropic).toHaveBeenLastCalledWith("claude-sonnet-4-5");
    vi.stubEnv("ANTHROPIC_MODEL", "custom-model");
    model();
    expect(anthropic).toHaveBeenLastCalledWith("custom-model");
  });
  it("embeds style prompt or falls back to a default voice", () => {
    expect(styleSystem(style)).toContain('<style name="S">\nbe terse');
    expect(styleSystem(null)).toContain("clear, natural, concise");
  });
});

describe("rewrite", () => {
  const posts = [
    { platform: "x", body: "a" },
    { platform: "wechat", title: "t", body: "b" },
  ];
  it("truncates source to 12000 chars, filters unrequested platforms, attaches media", async () => {
    generateObject.mockResolvedValue({ object: { posts } });
    const r = await rewrite({ source, platforms: ["x"], instruction: "shorter" });
    expect(r.posts).toEqual([posts[0]]);
    expect(r.media).toEqual({ images: ["i.png"], videos: ["v.mp4"] });
    const { prompt } = lastCall(generateObject);
    expect(prompt).toContain("User instruction: shorter");
    expect(prompt.match(/x/g)!.length).toBeLessThan(12_100);
  });
  it("omits instruction when absent", async () => {
    generateObject.mockResolvedValue({ object: { posts: [] } });
    await rewrite({ source, platforms: ["x"] });
    expect(lastCall(generateObject).prompt).not.toContain("User instruction");
  });
  it("propagates model failures", async () => {
    generateObject.mockRejectedValue(new Error("boom"));
    await expect(rewrite({ source, platforms: ["x"] })).rejects.toThrow("boom");
  });
});

describe("learnStyle", () => {
  const profile = { features: { avgSentenceLength: 5, vocabulary: [], rhythm: "r", devices: [], taboos: [] }, prompt: "p" };
  it("truncates each sample to 6000 chars and numbers them", async () => {
    generateObject.mockResolvedValue({ object: profile });
    expect(await learnStyle(["a".repeat(9000), "b"])).toEqual(profile);
    const { prompt } = lastCall(generateObject);
    expect(prompt).toContain('<sample n="2">');
    expect(prompt.match(/a/g)!.length).toBeLessThan(6100);
  });
  it("accepts empty samples (no sample tags) and propagates errors", async () => {
    generateObject.mockResolvedValue({ object: profile });
    await learnStyle([]);
    expect(lastCall(generateObject).prompt).not.toContain("<sample");
    generateObject.mockRejectedValue(new Error("schema mismatch"));
    await expect(learnStyle(["x"])).rejects.toThrow("schema mismatch");
  });
});

describe("refineStyle", () => {
  const out = { prompt: "new", changelog: ["c"] };
  beforeEach(() => generateObject.mockResolvedValue({ object: out }));
  it("feedback only", async () => {
    expect(await refineStyle({ style, feedback: "shorter" })).toEqual(out);
    const { prompt } = lastCall(generateObject);
    expect(prompt).toContain("User feedback: shorter");
    expect(prompt).not.toContain('kind="original"');
  });
  it("original+edited only, truncated", async () => {
    await refineStyle({ style, original: "o".repeat(9000), edited: "e" });
    const { prompt } = lastCall(generateObject);
    expect(prompt).not.toContain("User feedback");
    expect(prompt).toContain('kind="edited"');
    expect(prompt.match(/o/g)!.length).toBeLessThan(6100);
  });
  it("both, and half a pair is ignored", async () => {
    await refineStyle({ style, feedback: "f", original: "o", edited: "e" });
    expect(lastCall(generateObject).prompt).toContain('kind="original"');
    await refineStyle({ style, original: "o" });
    expect(lastCall(generateObject).prompt).not.toContain('kind="original"');
  });
});

describe("compose", () => {
  beforeEach(() => generateText.mockResolvedValue({ text: "out" }));
  it("long-form markdown without platform; references truncated", async () => {
    expect(await compose({ topic: "t", references: [{ ...source, text: "r".repeat(9000) }] })).toBe("out");
    const c = lastCall(generateText as never);
    expect(c.system).toContain("long-form article");
    expect(c.prompt).toContain('<reference url="https://e.com"');
    expect(c.prompt.match(/r/g)!.length).toBeLessThan(6100);
  });
  it("platform spec used when given", async () => {
    await compose({ topic: "t", platform: "x", style });
    expect(lastCall(generateText as never).system).toContain("Target platform");
  });
});
