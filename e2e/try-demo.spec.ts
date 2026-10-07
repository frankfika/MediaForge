import { expect, test } from "@playwright/test";

// Stubs the real network so this test runs offline; example.com went
// down twice during R34..R38 and these were the slowest / flakiest
// e2e in the suite. The browser still goes through the same
// `fetch_link` -> Readability code path on a fixed HTML body.
const SAMPLE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta property="og:title" content="Example Domain">
    <meta property="og:site_name" content="example.com">
  </head>
  <body>
    <h1>Example Domain</h1>
    <p>This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.</p>
  </body>
</html>`;

test.beforeEach(async ({ context }) => {
  await context.route("https://example.com/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/html", body: SAMPLE_HTML });
  });
});

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
