import { expect, test } from "@playwright/test";

test("home page renders dashboard, metrics, quick actions, and embedded chat", async ({ page }) => {
  await page.goto("/");
  // Title from the dashboard
  await expect(page.getByRole("heading", { name: "MediaForge", level: 1 })).toBeVisible();
  // Metrics strip has the 4 cards
  await expect(page.getByTestId("dashboard-metrics")).toBeVisible();
  // 6 quick actions (each links to a different page)
  const quicks = page.getByTestId("dashboard-quick");
  await expect(quicks).toHaveCount(6);
  await expect(quicks.nth(0)).toHaveAttribute("href", "/rewrite");
  await expect(quicks.nth(5)).toHaveAttribute("href", "/settings");
  // Embedded chat below the dashboard keeps the try-it button working
  await expect(page.getByText("今天想发点什么?")).toBeVisible();
});

test("dashboard language: switch via /settings, then back to /", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  // 6 quick actions are translated
  await expect(page.getByTestId("dashboard-quick").nth(0)).toContainText("Rewrite a link");
  await expect(page.getByTestId("dashboard-quick").nth(5)).toContainText("Settings");
  // subtitle is translated (use first() — chat also shows a similar fallback string)
  await expect(page.getByText("Paste a link or name a topic.").first()).toBeVisible();
});

test("/api/metrics is reachable from the dashboard fetch", async ({ request }) => {
  const r = await request.get("/api/metrics");
  expect(r.status()).toBe(200);
  const body = (await r.json()) as Record<string, number>;
  for (const key of ["rewrites", "composes", "learns", "exports", "embeds", "fetches"]) {
    expect(typeof body[key]).toBe("number");
    expect(Number.isFinite(body[key])).toBe(true);
    expect(body[key]).toBeGreaterThanOrEqual(0);
  }
});
