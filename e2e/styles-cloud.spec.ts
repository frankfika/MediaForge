import { expect, test } from "@playwright/test";

test("cloud tab without DATABASE_URL falls back to local with a warning", async ({ page }) => {
  await page.goto("/styles");
  await page.getByRole("button", { name: "加载演示风格" }).click();
  await page.getByRole("button", { name: /云端/ }).click();
  await expect(page.getByText(/云端同步不可用/)).toBeVisible();
  await expect(page.getByRole("button", { name: "本地", exact: true })).toHaveClass(/bg-/);
});
