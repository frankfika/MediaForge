import { expect, test } from "@playwright/test";

test("试一下 demo: example.com → 4 平台", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("今天想发点什么?")).toBeVisible();
  await page.getByRole("button", { name: /试一下:示例风格 \+ example\.com → 4 平台/ }).click();
  await expect(page.getByText("Example Domain").first()).toBeVisible({ timeout: 30_000 });
  // header = 4 tab chips + 公众号复制 + ZIP + 复制
  const header = page.getByRole("button", { name: "复制", exact: true }).locator("..");
  expect(await header.getByRole("button").count()).toBeGreaterThanOrEqual(7);
  await page.getByRole("button", { name: "复制", exact: true }).click();
  await expect(page.getByRole("button", { name: "已复制" })).toBeVisible({ timeout: 1500 });
});
