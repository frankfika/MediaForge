import { expect, test } from "@playwright/test";

test("style judge: 技术短句 against 极简技术流 → score, 5 bars, feedback", async ({ page }) => {
  await page.goto("/styles");
  await page.getByRole("button", { name: "加载演示风格" }).click();
  const card = page.locator("div.border", { has: page.locator("p.font-medium", { hasText: "极简技术流" }) }).last();
  await card.getByRole("button", { name: "测评", exact: true }).click();
  await card.getByRole("button", { name: "技术短句" }).click();
  await card.getByRole("button", { name: "开始测评" }).click();

  await expect(card.getByText("/ 100")).toBeVisible();
  for (const l of ["句长分布", "词汇重叠", "节奏", "句数", "禁忌遵守"]) await expect(card.getByText(l, { exact: true })).toBeVisible();
  await expect(card.locator("span.tabular-nums")).toHaveCount(5);
  await expect(card.locator("p.text-muted").last()).not.toBeEmpty();
});
