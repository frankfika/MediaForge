import { describe, expect, it } from "vitest";
import { diffStyleVersions } from "./style-diff";
import type { StyleVersion } from "./types";

const v = (version: number, prompt: string, vocabulary: string[] = []): StyleVersion => ({
  version,
  prompt,
  features: { avgSentenceLength: 10 + version, vocabulary, rhythm: "短", devices: [], taboos: [] },
  createdAt: "2026-01-01T00:00:00Z",
});

describe("diffStyleVersions", () => {
  it("identical versions have no changes", () => {
    const d = diffStyleVersions(v(1, "a\nb", ["x"]), v(1, "a\nb", ["x"]));
    expect(d.prompt).toMatchObject({ added: 0, removed: 0 });
    expect(d.prompt.chunks.every((c) => c.type === "same")).toBe(true);
    expect(d.features.vocabulary).toEqual({ added: [], removed: [] });
  });

  it("counts changed lines and feature deltas", () => {
    const d = diffStyleVersions(v(1, "a\nb\nc", ["x", "y"]), v(2, "a\nB\nc\nd", ["y", "z"]));
    expect(d.prompt).toMatchObject({ added: 2, removed: 1 });
    expect(d.features.vocabulary).toEqual({ added: ["z"], removed: ["x"] });
    expect(d.features.avgSentenceLength).toBe(1);
  });

  it("handles empty prompts and missing features", () => {
    const d = diffStyleVersions({ ...v(1, ""), features: null }, v(2, "hello"));
    expect(d.prompt).toMatchObject({ added: 1, removed: 0 });
    expect(diffStyleVersions(v(1, "x"), v(2, "")).prompt).toMatchObject({ added: 0, removed: 1 });
  });
});

describe("diffStyleVersions: missing / empty inputs", () => {
  const bare = (prompt: string): StyleVersion => ({ version: 1, prompt, createdAt: "2026-01-01T00:00:00Z" });
  it("no features on either side", () => {
    const d = diffStyleVersions(bare(""), bare(""));
    expect(d.prompt).toEqual({ added: 0, removed: 0, chunks: [] });
    expect(d.features).toEqual({
      vocabulary: { added: [], removed: [] },
      devices: { added: [], removed: [] },
      taboos: { added: [], removed: [] },
      avgSentenceLength: 0,
      rhythmChanged: false,
    });
  });
  it("features appearing from nothing, empty prompt → large prompt", () => {
    const big = Array.from({ length: 500 }, (_, i) => `line ${i}`).join("\n");
    const d = diffStyleVersions(bare(""), v(2, big, ["x"]));
    expect(d.prompt.added).toBe(500);
    expect(d.features.vocabulary.added).toEqual(["x"]);
    expect(d.features.rhythmChanged).toBe(true);
    expect(d.features.avgSentenceLength).toBe(12);
  });
});
