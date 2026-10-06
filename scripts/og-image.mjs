// Renders docs/assets/og.png (1200x630) from an inline SVG via macOS-friendly rsvg-convert. Local only.
import { execFileSync } from "node:child_process";
import { statSync, writeFileSync } from "node:fs";

const chips = ["公众号", "X", "小红书", "B 站"];
const chipSvg = chips
  .map((c, i) => {
    const x = 80 + i * 170;
    return `<rect x="${x}" y="400" width="150" height="52" rx="26" fill="#1f1f23" stroke="#3a3a42"/><text x="${x + 75}" y="435" text-anchor="middle" font-size="24" fill="#d4d4d8">${c}</text>`;
  })
  .join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" font-family="Helvetica, 'PingFang SC', sans-serif">
<rect width="1200" height="630" fill="#0b0b0d"/>
<text x="80" y="250" font-size="104" font-weight="700" fill="#fafafa">MediaForge</text>
<text x="80" y="320" font-size="34" fill="#a1a1aa">贴一个链接,AI 用你的文风写给每个平台</text>
<text x="80" y="362" font-size="26" fill="#71717a">Paste a link. Write in your voice. Copy, publish.</text>
${chipSvg}
<text x="1120" y="570" text-anchor="end" font-size="24" fill="#71717a">github.com/frankfika/MediaForge</text>
</svg>`;
writeFileSync("docs/assets/og.svg", svg);
try {
  execFileSync("rsvg-convert", ["-w", "1200", "-h", "630", "-o", "docs/assets/og.png", "docs/assets/og.svg"]);
} catch {
  // fallback: sips can rasterize SVG on macOS
  execFileSync("sips", ["-s", "format", "png", "docs/assets/og.svg", "--out", "docs/assets/og.png"]);
}
console.log(`og.png ${(statSync("docs/assets/og.png").size / 1024).toFixed(0)} KB`);
