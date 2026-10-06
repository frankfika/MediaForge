import { expect, test } from "@playwright/test";

test("⌘K opens chat drawer → type + Enter → Esc closes", async ({ page }) => {
  await page.goto("/settings");
  const drawer = page.getByRole("dialog", { name: "全局对话" });
  await page.keyboard.press("Control+k");
  await expect(drawer).toBeInViewport();
  const box = drawer.getByRole("textbox");
  await box.fill("你好");
  await box.press("Enter");
  await expect(drawer.getByText("你好").first()).toBeVisible();
  await expect(box).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeInViewport();
});
