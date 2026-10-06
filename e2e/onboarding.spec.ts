import { expect, test } from "@playwright/test";

test("showcase: first visit shows onboarding, dismiss persists", async ({ page }) => {
  await page.goto("/showcase");
  const card = page.getByTestId("onboarding");
  await expect(card).toBeVisible();
  await expect(card).toContainText("欢迎使用 MediaForge!");
  await card.getByRole("button", { name: "我知道了" }).click();
  await expect(card).toBeHidden();
  await page.reload();
  await expect(card).toBeHidden();
});
