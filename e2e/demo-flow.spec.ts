import { expect, test } from "@playwright/test";

test("demo flow: load demo styles → 试一下 → switch tabs → mock copy → clipboard", async ({ page }) => {
  await page.goto("/styles");
  await page.getByRole("button", { name: "加载演示风格" }).click();
  await expect(page.locator("p.font-medium", { hasText: "极简技术流" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: /试一下/ }).click();
  await expect(page.getByText("Example Domain").first()).toBeVisible({ timeout: 30_000 });

  for (const label of ["公众号", "X / 推特", "小红书", "B 站"])
    await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();

  // mock output markers: xhs title starts with ✨, bilibili title wrapped in 【】, wechat closes with a reply prompt
  await page.getByRole("button", { name: "小红书", exact: true }).click();
  await expect(page.getByText(/^✨/)).toBeVisible();
  await page.getByRole("button", { name: "B 站", exact: true }).click();
  await expect(page.getByText(/^【.*】$/)).toBeVisible();
  await page.getByRole("button", { name: "公众号", exact: true }).click();
  await expect(page.getByText(/欢迎在评论区聊聊/)).toBeVisible();

  await page.getByRole("button", { name: "复制", exact: true }).click();
  await expect(page.getByRole("button", { name: "已复制" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("欢迎在评论区聊聊");
});
