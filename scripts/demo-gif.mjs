// Records the 试一下 flow -> docs/assets/demo.gif (800px, <8s). Needs ffmpeg. Local only.
import { spawn, execFileSync } from "node:child_process";
import { renameSync, rmSync, statSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const OUT = "docs/assets";
const TMP = "docs/assets/.rec";
const up = () => fetch(`${BASE}/api/health`).then((r) => r.ok, () => false);

let server;
if (!(await up())) {
  server = spawn("pnpm", ["dev"], { stdio: "ignore", detached: true });
  for (let i = 0; i < 120 && !(await up()); i++) await new Promise((r) => setTimeout(r, 1000));
  if (!(await up())) { process.kill(-server.pid); throw new Error("dev server did not start"); }
}

const browser = await chromium.launch();
try {
  // warm-up: dev-mode compile time would otherwise eat the 8s budget
  const warm = await browser.newPage();
  await warm.goto(BASE);
  await warm.getByRole("button", { name: /试一下/ }).click();
  await warm.getByText("Example Domain").first().waitFor({ timeout: 60_000 });
  await warm.close();
  const ctx = await browser.newContext({
    viewport: { width: 800, height: 560 },
    permissions: ["clipboard-read", "clipboard-write"],
    recordVideo: { dir: TMP, size: { width: 800, height: 560 } },
  });
  const page = await ctx.newPage();
  await page.goto(BASE);
  const demo = page.getByRole("button", { name: /试一下/ });
  await demo.waitFor();
  await page.waitForTimeout(800);
  await demo.click();
  await page.getByText("Example Domain").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "复制", exact: true }).click();
  await page.getByRole("button", { name: "已复制" }).waitFor();
  await page.waitForTimeout(2000); // 1.5s reset
  const video = page.video();
  await ctx.close(); // flushes the video
  renameSync(await video.path(), `${OUT}/demo.webm`);
} finally {
  await browser.close();
  rmSync(TMP, { recursive: true, force: true });
  if (server) process.kill(-server.pid);
}

execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-t", "8", "-i", `${OUT}/demo.webm`,
  "-vf", "fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
  `${OUT}/demo.gif`]);
rmSync(`${OUT}/demo.webm`);
console.log(`demo.gif ${(statSync(`${OUT}/demo.gif`).size / 1024).toFixed(0)} KB`);
