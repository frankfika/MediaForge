// Real-network XHS fetch check (not part of CI). Usage:
//   pnpm test:xhs [https://www.xiaohongshu.com/explore/<id>]
// XHS_COOKIE is read from env or .env.local. See docs/xhs-cookie-test.md.
import { readFileSync } from "node:fs";
import { fetchLink } from "../lib/fetcher.ts";

try {
  for (const l of readFileSync(".env.local", "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const url = process.argv[2] || process.env.XHS_URL;
if (!url) {
  console.error("Usage: pnpm test:xhs <https://www.xiaohongshu.com/explore/<id>>  (or set XHS_URL)");
  process.exit(2);
}
const cookie = process.env.XHS_COOKIE;
console.log(`URL: ${url}\nCookie: ${cookie ? `yes (${cookie.length} chars)` : "no (anonymous)"}\n`);

try {
  const s = await fetchLink(url, cookie ? { xhs: cookie } : undefined);
  console.log("title:  ", s.title);
  console.log("author: ", s.author);
  console.log("text:   ", s.text.slice(0, 300) + (s.text.length > 300 ? "…" : ""));
  console.log("images: ", s.images.length, s.images.slice(0, 3));
  console.log("videos: ", s.videos.length, s.videos.slice(0, 3));
  const wall = /页面不见了|请登录|安全验证|验证码/.test(s.title + s.text.slice(0, 200)); // 404 / login / captcha shell, not a note
  const ok = s.text.length > 100 && !wall;
  console.log(
    `\n${ok ? "PASS" : "FAIL"}: text length ${s.text.length} (need > 100)${wall ? "; looks like a 404/login/captcha page, not a note" : ""}`,
  );
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
}
