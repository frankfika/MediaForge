import { describe, expect, it } from "vitest";
import { cosineSim, EMBED_DIM, generateEmbeddings } from "./embed";

describe("generateEmbeddings", () => {
  it("empty array -> empty", () => expect(generateEmbeddings([])).toEqual([]));
  it("one 64-dim vector per text, values in [-1, 1)", () => {
    const out = generateEmbeddings(["a", "b", ""]);
    expect(out).toHaveLength(3);
    for (const v of out) {
      expect(v).toHaveLength(EMBED_DIM);
      expect(v.every((n) => n >= -1 && n < 1)).toBe(true);
    }
  });
  it("deterministic per text, different across texts", () => {
    const [a1, b] = generateEmbeddings(["hello", "world"]);
    expect(generateEmbeddings(["hello"])[0]).toEqual(a1);
    expect(a1).not.toEqual(b);
  });
});

describe("cosineSim", () => {
  it("identical -> 1, opposite -> -1", () => {
    expect(cosineSim([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosineSim([1, 2], [-1, -2])).toBeCloseTo(-1);
  });
  it("orthogonal -> 0", () => expect(cosineSim([1, 0], [0, 1])).toBe(0));
  it("shorter b is zero-padded", () => expect(cosineSim([1, 0], [1])).toBeCloseTo(1));
  it("zero vector -> 0 (no NaN)", () => expect(cosineSim([0, 0], [1, 1])).toBe(0));
});
