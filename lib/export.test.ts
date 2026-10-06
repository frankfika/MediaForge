import { describe, expect, it } from "vitest";
import { buildExport, wechatHtml } from "./export";
import type { PlatformPost } from "./types";

describe("wechatHtml", () => {
  const html = wechatHtml({ platform: "wechat", title: "T", body: "## 第一节\n\n> 引用一句\n\n- 要点A\n- 要点B\n\n## 第二节\n\n正文 **重点**" });

  it("numbers headings with badges", () => {
    expect(html).toContain(">01<");
    expect(html).toContain(">02<");
  });
  it("renders blockquote and list items", () => {
    expect(html).toContain("<blockquote");
    expect(html).toContain("<li");
    expect(html).toContain("要点B");
  });
  it("inlines styles, no <style> block", () => {
    expect(html).toContain('style="');
    expect(html).not.toContain("<style");
  });
});

describe("wechatHtml edge cases", () => {
  it("escapes html, keeps emoji, renders inline code/numbered list/hr", () => {
    const h = wechatHtml({ platform: "wechat", title: 'A"<b>', body: "1. 一 😀\n2. 二\n\n---\n\n`x<y` & **粗**" }, ['a"b.png']);
    expect(h).toContain("A&quot;&lt;b&gt;");
    expect(h).toContain("😀");
    expect(h).toContain("<hr");
    expect(h).toContain("x&lt;y</code>");
    expect(h).toContain("&amp;");
    expect(h).toContain('src="a&quot;b.png"');
  });
  it("omits h1 for empty title and tolerates empty body", () => {
    const h = wechatHtml({ platform: "wechat", body: "" });
    expect(h).not.toContain("<h1");
    expect(h).toContain("END");
  });
});

describe("buildExport", () => {
  const media = { images: ["https://i/1.png", "https://i/2.png"], videos: ["https://v/1.mp4"] };
  const posts: PlatformPost[] = [
    { platform: "wechat", title: "W", body: "## 节\n\n正文" },
    { platform: "x", body: "tweet 🚀" },
    { platform: "xhs", title: "红", body: "笔记" },
    { platform: "bilibili", title: "B", body: "简介" },
  ];

  it("exports every platform with media", () => {
    const b = buildExport({ posts, media });
    expect(b.wechat_html).toContain("https://i/2.png");
    expect(b.x_txt).toBe("tweet 🚀");
    expect(b.xhs_md).toBe("# 红\n\n笔记\n");
    expect(b.bilibili_md).toBe("# B\n\n简介\n");
    expect(b.files.map((f) => f.name)).toEqual(["wechat.html", "x.txt", "xhs.md", "bilibili.md", "media.txt"]);
    expect(b.files.at(-1)?.content).toBe("https://i/1.png\nhttps://i/2.png\nhttps://v/1.mp4");
  });
  it("only media, no posts", () => {
    const b = buildExport({ posts: [], media });
    expect(b.wechat_html + b.x_txt + b.xhs_md + b.bilibili_md).toBe("");
    expect(b.files).toEqual([{ name: "media.txt", content: "https://i/1.png\nhttps://i/2.png\nhttps://v/1.mp4" }]);
  });
  it("wechat only, no images", () => {
    const b = buildExport({ posts: [posts[0]!], media: { images: [], videos: [] } });
    expect(b.wechat_html).not.toContain("<img");
    expect(b.files.map((f) => f.name)).toEqual(["wechat.html"]);
  });
  it("x without title is body only; x with title prefixes it", () => {
    expect(buildExport({ posts: [{ platform: "x", title: "T", body: "b" }], media: { images: [], videos: [] } }).x_txt).toBe("T\n\nb");
  });
});
