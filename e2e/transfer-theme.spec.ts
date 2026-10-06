import { expect, test } from "@playwright/test";

test("export all → re-import dedupes; theme toggle persists", async ({ page }) => {
  await page.goto("/styles");
  await page.getByRole("button", { name: "加载演示风格" }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "导出全部" }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^mediaforge-styles-\d{4}-\d{2}-\d{2}\.json$/);
  const json = await (await import("node:fs/promises")).readFile((await dl.path())!, "utf8");
  await page.getByLabel("导入风格 JSON").fill(json);
  await page.getByRole("button", { name: "导入", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(/导入了 \d+ 个风格/);
  await page.getByLabel("导入风格 JSON").fill("{bad");
  await page.getByRole("button", { name: "导入", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("没有可导入");

  await page.goto("/settings");
  const html = page.locator("html");
  await page.getByRole("button", { name: "深色" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "跟随系统" }).click();
  await expect(html).not.toHaveAttribute("data-theme");
});
