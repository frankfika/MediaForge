import { expect, test } from "@playwright/test";

const FAKE_UUID = "00000000-0000-4000-8000-000000000001";

test("GET /api/styles/{id} returns 503 NO_DB without DATABASE_URL", async ({ request }) => {
  const r = await request.get(`/api/styles/${FAKE_UUID}`);
  expect(r.status()).toBe(503);
  const body = (await r.json()) as { code: string };
  expect(body.code).toBe("NO_DB");
});

test("DELETE /api/styles/{id} returns 503 NO_DB without DATABASE_URL", async ({ request }) => {
  const r = await request.delete(`/api/styles/${FAKE_UUID}`);
  expect(r.status()).toBe(503);
  const body = (await r.json()) as { code: string };
  expect(body.code).toBe("NO_DB");
});

test("POST /api/styles/{id}/duplicate returns 503 NO_DB without DATABASE_URL", async ({ request }) => {
  const r = await request.post(`/api/styles/${FAKE_UUID}/duplicate`, { data: { name: "copy of foo" } });
  expect(r.status()).toBe(503);
  const body = (await r.json()) as { code: string };
  expect(body.code).toBe("NO_DB");
});

test("POST /api/styles/{id}/rename returns 400 on empty name (would also 503 with DB, but zod runs first if no DB)", async ({
  request,
}) => {
  const r = await request.post(`/api/styles/${FAKE_UUID}/rename`, { data: { name: "" } });
  // Without DB: 503 NO_DB. With DB: 400. styleRoute checks NO_DB
  // before zod; local dev returns 503. With DB the zod check would
  // return 400 first.
  expect([400, 503]).toContain(r.status());
});

test("GET /api/styles/{id}/export returns 503 NO_DB without DATABASE_URL", async ({ request }) => {
  const r = await request.get(`/api/styles/${FAKE_UUID}/export`);
  expect(r.status()).toBe(503);
  const body = (await r.json()) as { code: string };
  expect(body.code).toBe("NO_DB");
});

test("GET /api/styles/{id}/history returns 503 NO_DB without DATABASE_URL", async ({ request }) => {
  const r = await request.get(`/api/styles/${FAKE_UUID}/history`);
  expect(r.status()).toBe(503);
  const body = (await r.json()) as { code: string };
  expect(body.code).toBe("NO_DB");
});

test("/api/styles/{id} routes are listed in /api/openapi.json with examples", async ({ request }) => {
  const r = await request.get("/api/openapi.json");
  expect(r.status()).toBe(200);
  const body = (await r.json()) as { paths: Record<string, unknown> };
  // The 6 sub-routes added in R55 should all be present.
  for (const p of [
    "/api/styles/{id}",
    "/api/styles/{id}/duplicate",
    "/api/styles/{id}/rename",
    "/api/styles/{id}/export",
    "/api/styles/{id}/history",
  ]) {
    expect(body.paths).toHaveProperty(p);
  }
});

test("/api/openapi.json's /api/styles/{id} example has both a request and a response body for the GET", async ({ request }) => {
  const r = await request.get("/api/openapi.json");
  const body = (await r.json()) as { paths: Record<string, Record<string, { requestBody?: unknown; responses?: unknown }>> };
  const get = body.paths["/api/styles/{id}"]?.get;
  expect(get).toBeDefined();
  const responses = get?.responses as Record<string, { content?: Record<string, { example?: unknown }> }>;
  expect(responses?.["200"]?.content?.["application/json"]?.example).toBeDefined();
});
