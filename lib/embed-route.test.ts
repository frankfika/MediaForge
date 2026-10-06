import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/embed/[query]/route";
import { parseEmbedQs } from "./embed";

describe("parseEmbedQs", () => {
  it("no params → default topK 5, no corpus override", () => expect(parseEmbedQs("")).toEqual({ topK: 5 }));
  it("parses corpus + topK", () => expect(parseEmbedQs("?corpus=a,b,c&topK=2")).toEqual({ corpus: ["a", "b", "c"], topK: 2 }));
  it("trims entries and drops empties", () => expect(parseEmbedQs("?corpus= a ,, b ")).toEqual({ corpus: ["a", "b"], topK: 5 }));
  it("error on an all-empty corpus", () => expect(parseEmbedQs("?corpus=, ,")).toMatchObject({ error: expect.stringContaining("corpus") }));
  it("error on more than 200 docs", () =>
    expect(parseEmbedQs(`?corpus=${Array.from({ length: 201 }, (_, i) => `d${i}`).join(",")}`)).toMatchObject({
      error: expect.stringContaining("too large"),
    }));
  it("error on a doc over 8000 chars", () =>
    expect(parseEmbedQs(`?corpus=${"x".repeat(8001)}`)).toMatchObject({ error: expect.stringContaining("too long") }));
  it.each(["0", "-1", "2.5", "abc", "51"])("error on bad topK %s", (k) =>
    expect(parseEmbedQs(`?topK=${k}`)).toMatchObject({ error: expect.stringContaining("topK") }),
  );
});

describe("GET /api/embed/[query]", () => {
  const get = (path: string, query = "q") => GET(new Request(`http://x${path}`), { params: Promise.resolve({ query }) });

  it("400 on an empty query", async () => expect((await get("/api/embed/x", "   ")).status).toBe(400));
  it("400 on an over-long query", async () => expect((await get("/api/embed/x", "x".repeat(2001))).status).toBe(400));
  it("400 on a qs validation error", async () => expect((await get("/api/embed/x?corpus=")).status).toBe(400));

  it("default corpus: mock provider, echoes query, 5 results sorted desc", async () => {
    const r = await get("/api/embed/MediaForge", "MediaForge");
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toMatchObject({ provider: "mock", model: "mock-fnv1a", query: "MediaForge" });
    expect(body.results).toHaveLength(5);
    expect(body.results[0]).toHaveProperty("text");
    expect(body.results[0]).toHaveProperty("score");
    for (let i = 1; i < body.results.length; i++) {
      expect(body.results[i - 1].score).toBeGreaterThanOrEqual(body.results[i].score);
    }
  });

  it("custom corpus + topK=2 slices the ranking", async () => {
    const r = await get("/api/embed/foo?corpus=a,b,c&topK=2", "foo");
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.results).toHaveLength(2);
    expect(["a", "b", "c"]).toContain(body.results[0].text);
    expect(body.query).toBe("foo");
  });
});
