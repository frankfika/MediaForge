import { expect, test } from "@playwright/test";

test("search: query -> ranked doc cards, click shows 64-dim vector", async ({ page }) => {
  await page.goto("/search");
  await page.getByLabel("查询").fill("风格学习");
  const cards = page.getByTestId("doc-card");
  await expect(cards).toHaveCount(5);
  await expect(cards.first()).toContainText(/-?\d\.\d{3}/);
  await cards.first().click();
  await expect(page.getByTestId("doc-vec")).toContainText("64 dims");
});

test("showcase links to /search", async ({ page }) => {
  await page.goto("/showcase");
  await page.getByRole("link", { name: /语义搜索 demo/ }).click();
  await expect(page).toHaveURL(/\/search$/);
});
