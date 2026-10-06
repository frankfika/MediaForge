import { describe, expect, it } from "vitest";
import { en, HTML_LANG, isLocale, ja, LOCALES, LOCALE_COOKIE, localeFromCookie, t, zh, type Key } from "./i18n";

describe("t()", () => {
  it("looks up zh by default", () => expect(t("nav.chat")).toBe("对话"));
  it("looks up en when locale is provided", () => expect(t("nav.chat", "en")).toBe("Chat"));
  it("looks up ja when locale is ja", () => expect(t("nav.chat", "ja")).toBe("チャット"));
  it("fills placeholders in ja", () => expect(t("src.counts", "ja", { images: 3, videos: 1 })).toBe("画像 3 件 · 動画 1 件"));
  it("falls back to zh when locale is unknown", () => expect(t("nav.chat", "de" as never)).toBe("对话"));
  it("replaces single placeholder from params", () =>
    expect(t("chat.subActive", "zh", { name: "我的号" })).toBe("贴一个链接,或者说一个话题。当前风格:我的号"));
  it("replaces multiple placeholders", () => expect(t("src.counts", "en", { images: 3, videos: 1 })).toBe("3 images · 1 videos"));
  it("leaves unknown placeholders untouched", () => expect(t("chat.subActive", "zh")).toBe("贴一个链接,或者说一个话题。当前风格:{name}"));
  it("leaves placeholders absent from params untouched", () =>
    expect(t("chat.subActive", "zh", { other: "x" })).toBe("贴一个链接,或者说一个话题。当前风格:{name}"));
  it("falls back to the key itself when missing from both dictionaries", () => {
    expect(t("no.such.key" as never)).toBe("no.such.key");
    expect(t("no.such.key" as never, "en")).toBe("no.such.key");
  });
});

describe("isLocale", () => {
  it.each(["zh", "en", "ja"] as const)("accepts %s", (l) => expect(isLocale(l)).toBe(true));
  it.each(["de", "fr", "", "ZH", undefined, null])("rejects %s", (v) => expect(isLocale(v)).toBe(false));
});

describe("localeFromCookie", () => {
  it("parses the locale cookie", () => expect(localeFromCookie(`${LOCALE_COOKIE}=en; other=1`)).toBe("en"));
  it("falls back to zh when the cookie is missing", () => expect(localeFromCookie("foo=bar")).toBe("zh"));
  it("falls back to zh when the value is invalid", () => expect(localeFromCookie(`${LOCALE_COOKIE}=fr`)).toBe("zh"));
  it("tolerates malformed input", () => expect(localeFromCookie(undefined)).toBe("zh"));
  it("handles trailing/leading whitespace between pairs", () => expect(localeFromCookie(`  ${LOCALE_COOKIE}=zh  ;   foo=bar`)).toBe("zh"));
});

describe("dictionaries", () => {
  it("every zh key exists in en and ja", () => {
    const zhKeys = Object.keys(zh) as Key[];
    expect(zhKeys.length).toBeGreaterThan(50);
    for (const k of zhKeys) {
      expect(en).toHaveProperty(k);
      expect(ja).toHaveProperty(k);
    }
  });
  it("every en/ja key exists in zh", () => {
    const enKeys = Object.keys(en) as Key[];
    for (const k of enKeys) expect(zh).toHaveProperty(k);
    const jaKeys = Object.keys(ja) as Key[];
    for (const k of jaKeys) expect(zh).toHaveProperty(k);
  });
  it("ja and en have the same number of keys as zh", () => {
    expect(Object.keys(en).length).toBe(Object.keys(zh).length);
    expect(Object.keys(ja).length).toBe(Object.keys(zh).length);
  });
  it("HTML_LANG has a BCP-47 tag for every locale", () => {
    expect(HTML_LANG.ja).toBe("ja");
  });
  it("LOCALES and HTML_LANG line up", () => {
    expect(Object.keys(HTML_LANG).sort()).toEqual([...LOCALES].sort());
  });
});
