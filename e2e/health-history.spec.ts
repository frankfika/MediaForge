import { expect, test } from "@playwright/test";

test("GET /api/health returns 200 with services + endpoints shape", async ({ request }) => {
  const r = await request.get("/api/health");
  expect(r.status()).toBe(200);
  const body = (await r.json()) as {
    ok: boolean;
    version: string;
    mode: string;
    services: { postgres: { ok: boolean; detail?: string }; metricsFile: { ok: boolean }; metricsExists: { ok: boolean } };
    endpoints: string[];
  };
  expect(body.version).toBe("0.1.0");
  expect(["mock", "anthropic"]).toContain(body.mode);
  expect(body.services.postgres.ok).toBe(false); // no DATABASE_URL locally
  expect(typeof body.services.metricsFile.ok).toBe("boolean");
  expect(body.endpoints).toContain("/api/chat");
  expect(body.endpoints).toContain("/api/health");
});

test("GET /api/styles/test-uuid/history returns 503 NO_DB without DATABASE_URL", async ({ request }) => {
  const r = await request.get("/api/styles/00000000-0000-4000-8000-000000000001/history");
  // local dev has no DB; we expect 503 NO_DB just like the rest of the styles routes.
  expect(r.status()).toBe(503);
  const body = (await r.json()) as { code: string };
  expect(body.code).toBe("NO_DB");
});
