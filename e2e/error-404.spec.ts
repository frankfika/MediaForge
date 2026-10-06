import { expect, test } from "@playwright/test";

test("404 page links home", async ({ page }) => {
  await page.goto("/definitely-not-a-page");
  await expect(page.getByRole("link", { name: "回到首页" })).toBeVisible();
});
