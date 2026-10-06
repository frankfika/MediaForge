/** Per-platform export formats. WeChat strips <style>, so every rule is inlined on the element. */
import type { PlatformPost, RewriteResult } from "./types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const T = {
  ink: "#2b2b2b",
  sub: "#6b6b6b",
  accent: "#07a35a",
  line: "#e8e8e8",
  wash: "#f6f8f7",
  font: "-apple-system,BlinkMacSystemFont,'PingFang SC','Helvetica Neue','Microsoft YaHei',sans-serif",
};
const S = {
  root: `font-family:${T.font};font-size:16px;line-height:1.85;color:${T.ink};letter-spacing:.5px;padding:8px 4px;`,
  title: `font-size:24px;font-weight:700;line-height:1.4;margin:0 0 20px;color:${T.ink};`,
  p: "margin:0 0 18px;text-align:justify;",
  h: `display:flex;align-items:center;margin:34px 0 16px;font-size:19px;font-weight:700;color:${T.ink};`,
  num: `display:inline-block;margin-right:10px;padding:1px 8px;border-radius:4px;background:${T.accent};color:#fff;font-size:14px;font-weight:700;letter-spacing:1px;`,
  quote: `margin:0 0 18px;padding:12px 16px;border-left:4px solid ${T.accent};background:${T.wash};color:${T.sub};font-size:15px;border-radius:0 6px 6px 0;`,
  ul: "margin:0 0 18px;padding-left:22px;",
  li: "margin:0 0 6px;",
  strong: `color:${T.accent};font-weight:700;`,
  code: `padding:1px 5px;border-radius:3px;background:${T.wash};color:${T.accent};font-size:14px;`,
  imgWrap: "margin:22px 0;text-align:center;",
  img: "max-width:100%;height:auto;border-radius:6px;display:block;margin:0 auto;",
  hr: `border:none;border-top:1px solid ${T.line};margin:28px 0;`,
  foot: `margin-top:32px;text-align:center;color:${T.sub};font-size:13px;`,
};

const inline = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="${S.strong}">$1</strong>`)
    .replace(/`([^`]+)`/g, `<code style="${S.code}">$1</code>`);

/** Minimal markdown (## headings, > quotes, - lists, ---, paragraphs) -> inline-styled HTML. */
export function wechatHtml(post: PlatformPost, images: string[] = []): string {
  const out: string[] = [];
  let n = 0;
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(`<ul style="${S.ul}">${list.map((l) => `<li style="${S.li}">${inline(l)}</li>`).join("")}</ul>`);
    list = [];
  };
  for (const raw of post.body.split(/\n{2,}|\n(?=#{1,3} |> |- |\* |\d+\. )/)) {
    for (const line of raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)) {
      const li = line.match(/^(?:[-*]|\d+\.)\s+(.*)/);
      if (li?.[1]) {
        list.push(li[1]);
        continue;
      }
      flush();
      const h = line.match(/^#{1,3}\s+(.*)/);
      if (h?.[1])
        out.push(
          `<section style="${S.h}"><span style="${S.num}">${String(++n).padStart(2, "0")}</span><span>${inline(h[1])}</span></section>`,
        );
      else if (line.startsWith(">")) out.push(`<blockquote style="${S.quote}">${inline(line.replace(/^>\s*/, ""))}</blockquote>`);
      else if (/^-{3,}$/.test(line)) out.push(`<hr style="${S.hr}"/>`);
      else out.push(`<p style="${S.p}">${inline(line)}</p>`);
    }
  }
  flush();
  const imgs = images.map((src) => `<p style="${S.imgWrap}"><img src="${esc(src)}" style="${S.img}"/></p>`);
  // ponytail: images appended after the body; per-paragraph placement needs model-side markers.
  return `<section style="${S.root}">${post.title ? `<h1 style="${S.title}">${esc(post.title)}</h1>` : ""}${out.join("")}${imgs.join("")}<p style="${S.foot}">— END —</p></section>`;
}

const plain = (p?: PlatformPost) => (p ? (p.title ? `${p.title}\n\n${p.body}` : p.body) : "");
const md = (p?: PlatformPost) => (p ? `${p.title ? `# ${p.title}\n\n` : ""}${p.body}\n` : "");

export type ExportBundle = {
  wechat_html: string;
  x_txt: string;
  xhs_md: string;
  bilibili_md: string;
  files: { name: string; content: string }[];
};

export function buildExport({ posts, media }: RewriteResult): ExportBundle {
  const by = (p: PlatformPost["platform"]) => posts.find((x) => x.platform === p);
  const wechat = by("wechat");
  const b: Omit<ExportBundle, "files"> = {
    wechat_html: wechat ? wechatHtml(wechat, media.images) : "",
    x_txt: plain(by("x")),
    xhs_md: md(by("xhs")),
    bilibili_md: md(by("bilibili")),
  };
  const files = [
    ["wechat.html", b.wechat_html],
    ["x.txt", b.x_txt],
    ["xhs.md", b.xhs_md],
    ["bilibili.md", b.bilibili_md],
    ["media.txt", [...media.images, ...media.videos].join("\n")],
  ]
    .filter(([, c]) => c)
    .map(([name, content]) => ({ name: name!, content: content! }));
  return { ...b, files };
}
