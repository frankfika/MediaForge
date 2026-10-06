// Renders docs/assets/og.png (1200x630) and social-preview.png (1280x640, GitHub Social Preview) via rsvg-convert. Local only.
import { execFileSync } from "node:child_process";
import { statSync, writeFileSync } from "node:fs";

const chips = ["公众号", "X", "小红书", "B 站"];

function render(name, w, h, { star }) {
  const chipSvg = chips
    .map((c, i) => {
      const x = 80 + i * 170;
      return `<rect x="${x}" y="400" width="150" height="52" rx="26" fill="#1f1f23" stroke="#3a3a42"/><text x="${x + 75}" y="435" text-anchor="middle" font-size="24" fill="#d4d4d8">${c}</text>`;
    })
    .join("");
  const badge = star
    ? `<rect x="${w - 220}" y="48" width="140" height="48" rx="24" fill="#1f1f23" stroke="#3a3a42"/><text x="${w - 150}" y="81" text-anchor="middle" font-size="24" fill="#fbbf24">★ Star</text>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" font-family="Helvetica, 'PingFang SC', sans-serif">
<rect width="${w}" height="${h}" fill="#0b0b0d"/>
${badge}
<text x="80" y="250" font-size="104" font-weight="700" fill="#fafafa">MediaForge</text>
<text x="80" y="320" font-size="34" fill="#a1a1aa">贴一个链接,AI 用你的文风写给每个平台</text>
<text x="80" y="362" font-size="26" fill="#71717a">Paste a link. Write in your voice. Copy, publish.</text>
${chipSvg}
<text x="${w - 80}" y="${h - 60}" text-anchor="end" font-size="24" fill="#71717a">github.com/frankfika/MediaForge</text>
</svg>`;
  writeFileSync(`docs/assets/${name}.svg`, svg);
  try {
    execFileSync("rsvg-convert", ["-w", String(w), "-h", String(h), "-o", `docs/assets/${name}.png`, `docs/assets/${name}.svg`]);
  } catch {
    execFileSync("sips", ["-s", "format", "png", `docs/assets/${name}.svg`, "--out", `docs/assets/${name}.png`]);
  }
  console.log(`${name}.png ${w}x${h} ${(statSync(`docs/assets/${name}.png`).size / 1024).toFixed(0)} KB`);
}

render("og", 1200, 630, { star: false });
render("social-preview", 1280, 640, { star: true });
