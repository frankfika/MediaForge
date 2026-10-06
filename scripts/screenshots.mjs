// Generates README screenshots into docs/assets/. Local only (not in CI).
// Viewport is 800px wide, so no resize step / image lib is needed.
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const OUT = "docs/assets";
const up = () =>
  fetch(`${BASE}/api/health`).then(
    (r) => r.ok,
    () => false,
  );

let server;
if (!(await up())) {
  server = spawn("pnpm", ["dev"], { stdio: "ignore", detached: true });
  for (let i = 0; i < 120 && !(await up()); i++) await new Promise((r) => setTimeout(r, 1000));
  if (!(await up())) {
    process.kill(-server.pid);
    throw new Error("dev server did not start");
  }
}

const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 800, height: 560 } })).newPage();
  const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

  await page.goto(BASE);
  await page.getByRole("button", { name: /试一下/ }).waitFor();
  await shot("home");

  await page.getByRole("button", { name: /试一下/ }).click();
  await page.getByText("Example Domain").first().waitFor({ timeout: 30_000 });
  await shot("demo-output");

  await page.goto(`${BASE}/rewrite`);
  await page.locator("input").first().waitFor();
  await shot("rewrite");

  await page.goto(`${BASE}/styles`);
  await page.getByRole("button", { name: "加载演示风格" }).click();
  await page.waitForTimeout(500);
  await shot("styles");

  await page.goto(BASE);
  await page.locator("textarea").first().waitFor();
  await page.keyboard.press("Meta+k");
  await page.locator("textarea").last().focus();
  await page.waitForTimeout(500);
  await shot("chat-drawer");
} finally {
  await browser.close();
  if (server) process.kill(-server.pid);
}
