import { expect, test } from "@playwright/test";

test("language toggle: settings page label + nav items change between zh and en", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");

  // zh → en
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  // the nav now shows English labels (Settings / Search etc.)
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Search", exact: true })).toBeVisible();
  // settings page heading
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  // theme label switched
  await expect(page.getByText("Theme", { exact: true })).toBeVisible();
  // zh strings are gone
  await expect(page.getByRole("heading", { name: "设置" })).toHaveCount(0);

  // en → zh
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("heading", { name: "设置" })).toBeVisible();
  await expect(page.getByRole("link", { name: "设置", exact: true })).toBeVisible();
});

test("cookie locale survives a full page reload", async ({ page, context }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  // reload and the lang stays en
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeVisible();

  // different tab in the same context also sees the cookie
  const other = await context.newPage();
  await other.goto("/styles");
  await expect(other.locator("html")).toHaveAttribute("lang", "en");
  await expect(other.getByRole("heading", { name: "Styles" })).toBeVisible();
});

test("/styles page hardcoded strings move to en", async ({ page }) => {
  // seed zh: load demo styles, then visit settings and switch
  await page.goto("/styles");
  await page.getByRole("button", { name: "加载演示风格" }).click();
  await expect(page.getByText("存储", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "风格" })).toBeVisible();

  // switch to en via settings page
  await page.goto("/settings");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  // back to /styles: zh headings gone, en headings present
  await page.goto("/styles");
  await expect(page.getByRole("heading", { name: "Styles" })).toBeVisible();
  await expect(page.getByText("Storage", { exact: true })).toBeVisible();
  await expect(page.getByText("Import / Export", { exact: true })).toBeVisible();
  await expect(page.getByText("存储", { exact: true })).toHaveCount(0);
});
