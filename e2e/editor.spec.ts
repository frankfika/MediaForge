import { expect, test } from "@playwright/test";

test("editor: topic → 生成初稿 → mock LLM streams into textarea", async ({ page }) => {
  await page.goto("/editor");
  await page.getByPlaceholder("话题或一句话 brief").fill("为什么要写周报");
  await page.getByRole("button", { name: "生成初稿" }).click();
  const draft = page.locator("textarea").nth(1);
  await expect(draft).toHaveValue(/\S/, { timeout: 30_000 });
});
