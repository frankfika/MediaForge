import { expect, test } from "@playwright/test";

test("GET /api/chat POST without a key returns 500 (no mock LLM for chat)", async ({ request }) => {
  // /api/chat streams AI SDK v5 SSE. Without ANTHROPIC_API_KEY the
  // upstream call throws and the streaming handler turns the throw
  // into a 500 JSON body. /api/chat deliberately does not fall back
  // to the mock LLM (only /api/rewrite + /api/compose + /api/style
  // do) because the chat tool loop needs a real model.
  const r = await request.post("/api/chat", {
    data: { messages: [{ role: "user", content: "hi" }] },
  });
  expect(r.status()).toBe(500);
  const body = (await r.json()) as { error: string };
  expect(typeof body.error).toBe("string");
  expect(body.error.length).toBeGreaterThan(0);
});

test("GET /api/metrics returns all 7 numeric counters", async ({ request }) => {
  const r = await request.get("/api/metrics");
  expect(r.status()).toBe(200);
  const body = (await r.json()) as Record<string, number>;
  for (const k of ["rewrites", "composes", "learns", "refines", "exports", "embeds", "fetches"]) {
    expect(typeof body[k]).toBe("number");
    expect(Number.isInteger(body[k])).toBe(true);
    expect(body[k]).toBeGreaterThanOrEqual(0);
  }
});

test("GET /api/openapi.json exposes examples on 10+ routes", async ({ request }) => {
  const r = await request.get("/api/openapi.json");
  expect(r.status()).toBe(200);
  const body = (await r.json()) as { paths: Record<string, Record<string, { requestBody?: unknown; responses?: unknown }>> };

  // A route "has an example" if any of its operations has a body
  // example OR a response example. Stoplight Elements renders these
  // as the "try it" panel under each operation.
  const hasExample = (op: { requestBody?: unknown; responses?: unknown }) => {
    const rb = op.requestBody as { content?: Record<string, { example?: unknown }> } | undefined;
    if (rb?.content) {
      for (const c of Object.values(rb.content)) {
        if (c && typeof c === "object" && "example" in c) return true;
      }
    }
    const responses = (op.responses ?? {}) as Record<string, { content?: Record<string, { example?: unknown }> }>;
    for (const r of Object.values(responses)) {
      for (const c of Object.values(r.content ?? {})) {
        if (c && typeof c === "object" && "example" in c) return true;
      }
    }
    return false;
  };

  const withExamples = Object.entries(body.paths)
    .filter(([, methods]) => Object.values(methods).some(hasExample))
    .map(([p]) => p);

  // 10 routes currently carry a meaningful example body so /docs
  // (Stoplight Elements) shows the try-it panel with real data.
  expect(withExamples.length).toBeGreaterThanOrEqual(10);
  for (const p of [
    "/api/chat",
    "/api/rewrite",
    "/api/compose",
    "/api/style/learn",
    "/api/style/judge",
    "/api/embed",
    "/api/search",
    "/api/embed/{query}",
    "/api/styles",
    "/api/metrics",
    "/api/ping",
  ]) {
    expect(withExamples).toContain(p);
  }
});
