import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("export all → delete all → paste JSON → import restores styles", async ({ page }) => {
  await page.goto("/styles");
  await page.getByRole("button", { name: "加载演示风格" }).click();
  const names = ["极简技术流", "小红书种草", "公众号深度评论"];
  for (const n of names) await expect(page.locator("p.font-medium", { hasText: n })).toBeVisible();

  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "导出全部" }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^mediaforge-styles-\d{4}-\d{2}-\d{2}\.json$/);
  const json = await readFile((await dl.path())!, "utf8");

  const del = page.getByRole("button", { name: "删除", exact: true });
  while (await del.count()) await del.first().click();
  await expect(page.getByText("还没有风格")).toBeVisible();

  await page.getByLabel("导入风格 JSON").fill(json);
  await page.getByRole("button", { name: "导入", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(`导入了 ${names.length} 个风格`);
  for (const n of names) await expect(page.locator("p.font-medium", { hasText: n })).toBeVisible();
});
