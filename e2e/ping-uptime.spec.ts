import { expect, test } from "@playwright/test";

test("GET /api/ping always returns 200 + pong", async ({ request }) => {
  const r = await request.get("/api/ping");
  expect(r.status()).toBe(200);
  const body = (await r.json()) as { pong: boolean; at: string };
  expect(body.pong).toBe(true);
  // at is a parseable ISO timestamp
  expect(() => new Date(body.at).toISOString()).not.toThrow();
});

test("GET /api/health now exposes build + uptime", async ({ request }) => {
  const r = await request.get("/api/health");
  expect(r.status()).toBe(200);
  const body = (await r.json()) as {
    ok: boolean;
    version: string;
    build: { sha: string; builtAt: string };
    uptime: number;
    services: { postgres: { ok: boolean }; metricsFile: { ok: boolean } };
  };
  expect(body.version).toBe("0.1.0");
  expect(typeof body.build.sha).toBe("string");
  expect(() => new Date(body.build.builtAt).toISOString()).not.toThrow();
  expect(typeof body.uptime).toBe("number");
  expect(body.uptime).toBeGreaterThanOrEqual(0);
  expect(body.services.postgres.ok).toBe(false); // no DB locally
});
