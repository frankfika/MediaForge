import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertPublic, fetchLink } from "./fetcher";

describe("assertPublic", () => {
  it.each([
    "http://localhost/",
    "http://127.0.0.1/",
    "http://10.0.0.1/",
    "http://192.168.1.1/",
    "http://172.20.0.1/",
    "http://169.254.169.254/",
    "http://[::1]/",
  ])("rejects %s", (u) => {
    expect(() => assertPublic(new URL(u))).toThrow();
  });
  it("rejects non-http", () => expect(() => assertPublic(new URL("file:///etc/passwd"))).toThrow());
  it("accepts example.com", () => expect(() => assertPublic(new URL("https://example.com"))).not.toThrow());
});

type Reply = { body?: unknown; status?: number; finalUrl?: string };
type Handler = (url: string, init?: RequestInit) => Reply;

/** Replace globalThis.fetch; `h` maps a request to a reply. Returns the call log. */
function mockFetch(h: Handler) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const { body = "", status = 200, finalUrl = url } = h(url, init);
    const res = new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
    Object.defineProperty(res, "url", { value: finalUrl }); // Response.url is read-only and empty for synthetic responses
    return res;
  });
  return calls;
}

const longText = "这是一段足够长的正文内容,用来保证它不会被当成内容过薄而触发回退。".repeat(5);
const page = (inner: string, head = "") => `<html><head>${head}</head><body>${inner}</body></html>`;

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchLink: validation", () => {
  it("rejects non-http(s)", async () => {
    await expect(fetchLink("ftp://example.com/a")).rejects.toThrow(/http/);
  });
  it("rejects private addresses without touching the network", async () => {
    const calls = mockFetch(() => ({}));
    await expect(fetchLink("http://127.0.0.1/admin")).rejects.toThrow(/Private/);
    expect(calls).toHaveLength(0);
  });
  it("rejects a redirect that lands on a private address", async () => {
    mockFetch(() => ({ body: "secret", finalUrl: "http://169.254.169.254/latest" }));
    await expect(fetchLink("https://redirect.example.com/r")).rejects.toThrow(/Private/);
  });
  it("throws on non-2xx when there is no fallback", async () => {
    mockFetch(() => ({ status: 404 }));
    await expect(fetchLink("https://example.com/missing")).rejects.toThrow(/404/);
  });
});

describe("fetchLink: site adapters", () => {
  it("X → fxtwitter API", async () => {
    const calls = mockFetch(() => ({
      body: {
        tweet: {
          text: "hello world",
          author: { name: "Ann" },
          media: { photos: [{ url: "https://p/1.jpg" }], videos: [{ url: "https://v/1.mp4" }] },
        },
      },
    }));
    const s = await fetchLink("https://x.com/ann/status/123");
    expect(calls[0]!.url).toBe("https://api.fxtwitter.com/ann/status/123");
    expect(s).toMatchObject({
      title: "hello world",
      author: "Ann",
      text: "hello world",
      images: ["https://p/1.jpg"],
      videos: ["https://v/1.mp4"],
    });
  });
  it("X: non-tweet URL is rejected", async () => {
    mockFetch(() => ({}));
    await expect(fetchLink("https://twitter.com/ann")).rejects.toThrow(/tweet/);
  });
  it("Bilibili → view API by BV id", async () => {
    const calls = mockFetch(() => ({ body: { data: { title: "T", desc: "D", pic: "https://pic/1.jpg", owner: { name: "UP" } } } }));
    const s = await fetchLink("https://www.bilibili.com/video/BV1xx411c7mD");
    expect(calls[0]!.url).toBe("https://api.bilibili.com/x/web-interface/view?bvid=BV1xx411c7mD");
    expect(s).toMatchObject({ title: "T", author: "UP", text: "D", images: ["https://pic/1.jpg"] });
    expect(s.videos[0]).toContain("bvid=BV1xx411c7mD");
  });
  it("Bilibili: no BV id is rejected", async () => {
    mockFetch(() => ({}));
    await expect(fetchLink("https://www.bilibili.com/read/cv1")).rejects.toThrow(/Bilibili/);
  });
  it.each([
    ["https://b23.tv/abc", "https://www.bilibili.com/video/BV1short0001"],
    ["https://xhslink.com/abc", "https://www.xiaohongshu.com/explore/short1"],
  ])("short link %s is resolved recursively", async (short, target) => {
    const calls = mockFetch((url) => {
      if (url === short) return { body: "", finalUrl: target };
      if (url.startsWith("https://api.bilibili.com"))
        return { body: { data: { title: "B", desc: "d", pic: "https://pic/b.jpg", owner: { name: "o" } } } };
      return {
        body: page("", `<meta property="og:title" content="XHS note"><meta property="og:description" content="${longText}">`),
        finalUrl: url,
      };
    });
    const s = await fetchLink(short);
    expect(calls[0]!.url).toBe(short);
    expect(calls.length).toBeGreaterThan(1);
    expect(s.url).toBe(target);
  });
});

describe("fetchLink: html", () => {
  it("WeChat: #js_content selector", async () => {
    mockFetch(() => ({
      body: page(
        `<h1 id="activity-name"> 标题 </h1><span id="js_name">公众号X</span><div id="js_content"><p>${longText}</p><img data-src="https://mmbiz/1.png"><img src="/rel.png"></div>`,
      ),
    }));
    const s = await fetchLink("https://mp.weixin.qq.com/s/wx1");
    expect(s).toMatchObject({ title: "标题", author: "公众号X", images: ["https://mmbiz/1.png"], videos: [] });
    expect(s.text).toContain("足够长的正文");
  });
  it("generic: Readability + og meta", async () => {
    mockFetch(() => ({
      body: page(
        `<article><h1>Hello</h1><p>${longText}</p><p>${longText}</p><img src="https://img/in.png"></article>`,
        `<title>Hello</title><meta property="og:image" content="https://img/og.png"><meta property="og:video" content="https://v/o.mp4"><meta property="og:site_name" content="Site">`,
      ),
    }));
    const s = await fetchLink("https://blog.example.com/post");
    expect(s.text).toContain("足够长的正文");
    expect(s.images).toContain("https://img/og.png");
    expect(s.videos).toEqual(["https://v/o.mp4"]);
  });
});

describe("fetchLink: cache", () => {
  it("serves a repeat within 5 minutes from memory, then refetches after expiry", async () => {
    vi.useFakeTimers();
    try {
      const calls = mockFetch(() => ({ body: { tweet: { text: "t", author: { name: "a" } } } }));
      await fetchLink("https://x.com/c/status/1");
      await fetchLink("https://x.com/c/status/1");
      expect(calls).toHaveLength(1);
      vi.advanceTimersByTime(300_001);
      await fetchLink("https://x.com/c/status/1");
      expect(calls).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("fetchLink: cookies", () => {
  const cookie = (init?: RequestInit) => (init?.headers as Record<string, string>).cookie;
  it("attaches the xhs cookie only on xiaohongshu.com", async () => {
    const calls = mockFetch((url) => ({ body: page(`<p>${longText}</p>`, `<meta property="og:title" content="n">`), finalUrl: url }));
    await fetchLink("https://www.xiaohongshu.com/explore/ck1", { xhs: " a=1 " });
    await fetchLink("https://other.example.com/ck2", { xhs: "a=1" });
    expect(cookie(calls[0]!.init)).toBe("a=1");
    expect(cookie(calls[1]!.init)).toBeUndefined();
  });
  it("a cookie-less cached result does not shadow a logged-in retry", async () => {
    const calls = mockFetch((url) => ({ body: page(`<p>${longText}</p>`), finalUrl: url }));
    await fetchLink("https://www.xiaohongshu.com/explore/ck3");
    await fetchLink("https://www.xiaohongshu.com/explore/ck3", { xhs: "a=1" });
    expect(calls).toHaveLength(2);
  });
});

describe("fetchLink: firecrawl fallback", () => {
  const thinPage = page("<p>hi</p>", `<meta property="og:title" content="Thin">`);
  const fc = (url: string) =>
    url.includes("firecrawl")
      ? {
          body: {
            data: {
              markdown: `# Full\n\n${longText}\n\n![a](https://img/fc.png)`,
              metadata: { title: "FC title", ogImage: "https://img/og.png" },
            },
          },
        }
      : { body: thinPage };

  it("no key: thin local result is returned as-is", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "");
    const calls = mockFetch(() => ({ body: thinPage }));
    const s = await fetchLink("https://thin.example.com/nokey");
    expect(s.title).toBe("Thin");
    expect(calls.every((c) => !c.url.includes("firecrawl"))).toBe(true);
  });
  it("key + thin content: falls back to firecrawl", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "fc-test");
    const calls = mockFetch(fc);
    const s = await fetchLink("https://thin.example.com/key");
    const call = calls.find((c) => c.url.includes("firecrawl"))!;
    expect((call.init?.headers as Record<string, string>).authorization).toBe("Bearer fc-test");
    expect(s.title).toBe("FC title");
    expect(s.images).toEqual(["https://img/og.png", "https://img/fc.png"]);
  });
  it("key + non-thin content: firecrawl is not called", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "fc-test");
    const calls = mockFetch((url) => ({ body: page(`<p>${longText}</p>`), finalUrl: url }));
    await fetchLink("https://rich.example.com/a");
    expect(calls.some((c) => c.url.includes("firecrawl"))).toBe(false);
  });
  it("firecrawl failure keeps the thin local result", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "fc-test");
    mockFetch((url) => (url.includes("firecrawl") ? { status: 500 } : { body: thinPage }));
    expect((await fetchLink("https://thin.example.com/fail")).title).toBe("Thin");
  });
  it("firecrawl network throw keeps the thin local result", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "fc-test");
    mockFetch((url) => {
      if (url.includes("firecrawl")) throw new Error("offline");
      return { body: thinPage };
    });
    expect((await fetchLink("https://thin.example.com/throw")).title).toBe("Thin");
  });
  it("firecrawl rescues a local fetch error", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "fc-test");
    mockFetch((url) => (url.includes("firecrawl") ? fc(url) : { status: 403 }));
    expect((await fetchLink("https://wall.example.com/a")).title).toBe("FC title");
  });
});

describe("fetchLink: sparse metadata branches", () => {
  it("WeChat page without title/author nodes falls back to og:title / empty author", async () => {
    mockFetch(() => ({ body: page(`<div id="js_content">${longText}</div>`, `<meta property="og:title" content="OG">`) }));
    const s = await fetchLink("https://mp.weixin.qq.com/s/sparse");
    expect(s).toMatchObject({ title: "OG", author: "" });
  });
  it("firecrawl: ogTitle fallback, no author, no metadata", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "fc-test");
    const thin = page("<p>hi</p>");
    const reply = (data: unknown) => (url: string) => (url.includes("firecrawl") ? { body: { data } } : { body: thin });
    mockFetch(reply({ markdown: longText, metadata: { ogTitle: "OGT" } }));
    expect(await fetchLink("https://thin.example.com/fc1")).toMatchObject({ title: "OGT", author: "", images: [] });
    mockFetch(reply({ markdown: longText }));
    expect((await fetchLink("https://thin.example.com/fc2")).title).toBe("");
  });
  it("firecrawl: empty markdown / missing data keep the local result", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "fc-test");
    const thin = page("<p>hi</p>", `<meta property="og:title" content="Thin">`);
    mockFetch((url) => (url.includes("firecrawl") ? { body: { data: { markdown: "  " } } } : { body: thin }));
    expect((await fetchLink("https://thin.example.com/fc3")).title).toBe("Thin");
    mockFetch((url) => (url.includes("firecrawl") ? { body: {} } : { body: thin }));
    expect((await fetchLink("https://thin.example.com/fc4")).title).toBe("Thin");
  });
  it("generic page: no article, no og → empty fields", async () => {
    mockFetch(() => ({ body: "<html><body></body></html>" }));
    expect(await fetchLink("https://empty.example.com/a")).toMatchObject({ title: "", text: "" });
  });
  it("img without http src is dropped; data-src preferred", async () => {
    mockFetch(() => ({
      body: page(`<div id="js_content">${longText}<img data-src="https://i/a.png" src="x"><img src="/rel.png"><img></div>`),
    }));
    expect((await fetchLink("https://mp.weixin.qq.com/s/imgs")).images).toEqual(["https://i/a.png"]);
  });
});
