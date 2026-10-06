import { describe, expect, it } from "vitest";
import { wechatHtml } from "./export";

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
