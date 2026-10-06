import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cosineSim, EMBED_DIM, generateEmbeddings, generateEmbeddingsAuto, getOpenAIProvider } from "./embed";

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

describe("getOpenAIProvider", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it("returns null without OPENAI_API_KEY", () => {
    expect(getOpenAIProvider()).toBeNull();
  });
  it("returns a callable provider when OPENAI_API_KEY is set", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const p = getOpenAIProvider();
    expect(p).not.toBeNull();
    expect(typeof p).toBe("function");
  });
  it("uses OPENAI_EMBEDDING_MODEL env override", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large");
    expect(getOpenAIProvider()).not.toBeNull();
  });
});

describe("generateEmbeddingsAuto", () => {
  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => vi.unstubAllEnvs());

  it("falls back to mock with provider label when no key", async () => {
    const r = await generateEmbeddingsAuto(["a", "b"]);
    expect(r.provider).toBe("mock");
    expect(r.model).toBe("mock-fnv1a");
    expect(r.dim).toBe(EMBED_DIM);
    expect(r.vectors).toHaveLength(2);
  });

  it("falls back to mock on upstream error (no real call when fetch is blocked)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    // global fetch is overridden to throw (simulating network / DNS error)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const r = await generateEmbeddingsAuto(["hi"]);
    expect(r.provider).toBe("mock");
    expect(r.vectors[0]).toHaveLength(EMBED_DIM);
  });

  it("uses OpenAI when fetch succeeds and returns data[].embedding", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const r = await generateEmbeddingsAuto(["a", "b"]);
    expect(r.provider).toBe("openai");
    expect(r.model).toBe("text-embedding-3-small");
    expect(r.dim).toBe(3);
    expect(r.vectors).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);
  });
});
