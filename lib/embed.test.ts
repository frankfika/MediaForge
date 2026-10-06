import { describe, expect, it } from "vitest";
import { EMBED_DIM, generateEmbeddings } from "./embed";

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
