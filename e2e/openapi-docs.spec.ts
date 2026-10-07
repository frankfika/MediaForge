import { expect, test } from "@playwright/test";

test("GET /api/openapi.json serves a valid OpenAPI 3.1 document", async ({ request }) => {
  const r = await request.get("/api/openapi.json");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("application/json");
  const body = (await r.json()) as { openapi: string; info: { title: string }; paths: Record<string, unknown> };
  expect(body.openapi).toBe("3.1.0");
  expect(body.info.title).toBe("MediaForge API");
  expect(Object.keys(body.paths)).toContain("/api/health");
});

test("/docs renders the heading + a link back to the home", async ({ page }) => {
  await page.goto("/docs");
  await expect(page.getByRole("heading", { name: "MediaForge API", level: 1 })).toBeVisible();
  // Spec loader script tries to fetch /api/openapi.json; in Playwright
  // the page works without the docs-root custom-element being rendered
  // (Stoplight Elements only paint after JS hydrates and a network round-trip
  // to a known CORS-permissive CDN). 这里就只检查 title + back link 即可。
  await expect(page.getByRole("link", { name: "返回首页" })).toBeVisible();
  await page.getByRole("link", { name: "返回首页" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("nav links to /docs and the OpenAPI link mentions the JSON path", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.goto("/docs");
  await expect(page.getByRole("link", { name: "API docs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "/api/openapi.json" })).toBeVisible();
});