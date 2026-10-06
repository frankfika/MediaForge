import { expect, test } from "@playwright/test";

test("refine: demo style -> expand -> feedback -> changelog note", async ({ page }) => {
  await page.goto("/styles");
  await page.getByRole("button", { name: "加载演示风格" }).click();
  const card = page.locator("div.rounded-\\[var\\(--radius-card\\)\\]", { hasText: "极简技术流" }).first();
  await card.getByRole("button", { name: "展开" }).click();
  await expect(card.getByText(/最近修正/)).toBeVisible();
  await card.getByPlaceholder(/哪里不像/).fill("太正式,多用短句");
  await card.getByRole("button", { name: "修正" }).click();
  await expect(card.getByText("v2")).toBeVisible();
});

test("learn: name + samples -> new style card appears", async ({ page }) => {
  await page.goto("/styles");
  await page.getByPlaceholder(/风格名/).fill("E2E 风格");
  await page.getByPlaceholder(/贴 3–5 篇样本/).fill("今天天气不错。我们去公园走走吧!\n---\n简单就是美。少即是多,不是吗?");
  await page.getByRole("button", { name: "学习这个风格" }).click();
  await expect(page.getByRole("main").getByText("E2E 风格", { exact: true })).toBeVisible();
});
