import { expect, test } from "@playwright/test";

test("⌘K opens chat drawer → type + Enter → Esc closes", async ({ page }) => {
  await page.goto("/settings");
  const drawer = page.getByRole("dialog", { name: "全局对话" });
  await page.locator("body").click();
  await page.keyboard.press("Control+k");
  // drawer uses a spring slide-in; wait for inert to be removed (the React state, not the spring)
  await expect(drawer).not.toHaveAttribute("inert", "", { timeout: 10_000 });
  const box = drawer.getByRole("textbox");
  await box.fill("你好");
  await box.press("Enter");
  await expect(drawer.getByText("你好").first()).toBeVisible();
  await expect(box).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveAttribute("inert", "", { timeout: 10_000 });
});
