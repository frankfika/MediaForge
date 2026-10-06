import { expect, test } from "@playwright/test";

test("settings: theme toggle switches data-theme", async ({ page }) => {
  await page.goto("/settings");
  for (const label of ["浅色", "深色", "跟随系统"]) await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "跟随系统", exact: true }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
});
