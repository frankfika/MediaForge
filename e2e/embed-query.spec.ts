import { expect, test } from "@playwright/test";

test("GET /api/embed/MediaForge: default corpus returns 5 ranked results", async ({ request }) => {
  const res = await request.get("/api/embed/MediaForge");
  expect(res.status()).toBe(200);
  const body = (await res.json()) as {
    provider: string;
    model: string;
    query: string;
    results: { text: string; score: number }[];
  };
  expect(body.provider).toBe("mock");
  expect(body.model).toBe("mock-fnv1a");
  expect(body.query).toBe("MediaForge");
  expect(body.results).toHaveLength(5);
  for (let i = 1; i < body.results.length; i++) {
    expect(body.results[i - 1]!.score).toBeGreaterThanOrEqual(body.results[i]!.score);
  }
});

test("GET /api/embed/foo: ?corpus=a,b,c&topK=2 returns 2 results", async ({ request }) => {
  const res = await request.get("/api/embed/foo?corpus=a,b,c&topK=2");
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { results: { text: string; score: number }[] };
  expect(body.results).toHaveLength(2);
  expect(["a", "b", "c"]).toContain(body.results[0]!.text);
});

test("GET /api/embed: validates query, corpus and topK", async ({ request }) => {
  expect((await request.get("/api/embed/x?corpus=")).status()).toBe(400);
  expect((await request.get("/api/embed/x?topK=0")).status()).toBe(400);
});
