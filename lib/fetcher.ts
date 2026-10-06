/**
 * Link fetcher: URL (X, Xiaohongshu, Bilibili, WeChat, or any article) -> Source.
 * Libraries: linkedom (DOM), @mozilla/readability (article extraction).
 * Twitter goes through the public fxtwitter API; Bilibili through its public view API.
 * Zero framework imports so it runs standalone: `pnpm fetch <url>`.
 */
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { inc } from "./metrics";
import type { Source } from "./types";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

// ponytail: per-process memo, 5 min. Swap for Vercel KV if cold starts make it useless.
const cache = new Map<string, { at: number; value: Source }>();

// ponytail: hostname check only; DNS-rebinding to private IPs needs a resolver-level guard.
export function assertPublic(u: URL) {
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) URLs are supported");
  if (/^(localhost$|0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(u.hostname))
    throw new Error("Private addresses are not allowed");
}

/** Cookies per site. Only sent to that site's own hosts, never to arbitrary URLs. */
export type Cookies = { xhs?: string };
const XHS = /(^|\.)(xiaohongshu\.com|xhslink\.com)$/;

async function get(url: string, cookies?: Cookies) {
  const target = new URL(url);
  assertPublic(target);
  const cookie = XHS.test(target.hostname) ? cookies?.xhs?.trim() : undefined;
  const res = await fetch(url, {
    headers: { "user-agent": UA, "accept-language": "zh-CN,zh;q=0.9,en;q=0.8", ...(cookie && { cookie }) },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  assertPublic(new URL(res.url)); // re-check after redirects
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
  return res;
}

async function twitter(u: URL, cookies?: Cookies): Promise<Source> {
  const [, user, , id] = u.pathname.split("/"); // /{user}/status/{id}
  if (!user || !id) throw new Error("Not a tweet URL");
  const { tweet } = (await (await get(`https://api.fxtwitter.com/${user}/status/${id}`, cookies)).json()) as {
    tweet: {
      text: string;
      author: { name: string };
      media?: { photos?: { url: string }[]; videos?: { url: string }[] };
    };
  };
  return {
    url: u.href,
    title: tweet.text.slice(0, 60),
    author: tweet.author.name,
    text: tweet.text,
    images: tweet.media?.photos?.map((p) => p.url) ?? [],
    videos: tweet.media?.videos?.map((v) => v.url) ?? [],
  };
}

async function bilibili(u: URL, cookies?: Cookies): Promise<Source> {
  const bvid = u.pathname.match(/BV\w+/)?.[0];
  if (!bvid) throw new Error("Not a Bilibili video URL");
  const { data } = (await (await get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, cookies)).json()) as {
    data: { title: string; desc: string; pic: string; owner: { name: string } };
  };
  return {
    url: u.href,
    title: data.title,
    author: data.owner.name,
    text: data.desc,
    images: [data.pic],
    videos: [`https://player.bilibili.com/player.html?bvid=${bvid}`], // embeddable player, not a raw file
  };
}

/** WeChat (#js_content), Xiaohongshu (og: meta) and generic articles (Readability). */
async function html(u: URL, cookies?: Cookies): Promise<Source> {
  const { document } = parseHTML(await (await get(u.href, cookies)).text());
  const meta = (p: string) => document.querySelector(`meta[property="${p}"]`)?.getAttribute("content") ?? "";
  const metaAll = (p: string) =>
    [...document.querySelectorAll(`meta[property="${p}"]`)].map((m) => m.getAttribute("content") ?? "").filter(Boolean);
  const imgs = (root: ParentNode) =>
    [...root.querySelectorAll("img")]
      .map((i) => i.getAttribute("data-src") ?? i.getAttribute("src") ?? "")
      .filter((s) => s.startsWith("http"));

  const wx = document.querySelector("#js_content");
  if (wx) {
    return {
      url: u.href,
      title: document.querySelector("#activity-name")?.textContent?.trim() || meta("og:title"),
      author: document.querySelector("#js_name")?.textContent?.trim() ?? "",
      text: wx.textContent?.replace(/\n{3,}/g, "\n\n").trim() ?? "",
      images: imgs(wx),
      videos: [],
    };
  }

  const article = new Readability(document as unknown as Document).parse();
  return {
    url: u.href,
    title: article?.title || meta("og:title"),
    author: article?.byline ?? meta("og:site_name"),
    text: article?.textContent?.trim() || meta("og:description"),
    images: [...new Set([...metaAll("og:image"), ...(article?.content ? imgs(parseHTML(article.content).document) : [])])],
    videos: metaAll("og:video"),
  };
}

/** Firecrawl fallback for login walls / JS-only pages. Returns null (never throws) when no key or on any failure. */
async function firecrawl(u: URL): Promise<Source | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ url: u.href, formats: ["markdown"], onlyMainContent: true }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return null;
    const { data } = (await res.json()) as {
      data?: { markdown?: string; metadata?: { title?: string; author?: string; ogImage?: string; ogTitle?: string } };
    };
    const text = data?.markdown?.trim();
    if (!text) return null;
    const m = data?.metadata ?? {};
    const images = [...new Set([m.ogImage, ...[...text.matchAll(/!\[[^\]]*\]\((https?:[^)\s]+)\)/g)].map((x) => x[1])])].filter(
      (s): s is string => !!s,
    );
    return { url: u.href, title: m.title || m.ogTitle || "", author: m.author ?? "", text, images, videos: [] };
  } catch {
    return null;
  }
}

const thin = (s: Source) => s.text.length < 80;

export async function fetchLink(raw: string, cookies?: Cookies): Promise<Source> {
  const key = cookies?.xhs ? `${raw}#c` : raw; // a cookie-less thin result must not shadow a logged-in retry
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 300_000) return hit.value;

  const u = new URL(raw);
  assertPublic(u);
  inc("fetches");
  const host = u.hostname.replace(/^www\./, "");

  let value: Source;
  if (/^(b23\.tv|xhslink\.com)$/.test(host))
    value = await fetchLink((await get(u.href, cookies)).url, cookies); // resolve short link
  else if (/^(x|twitter)\.com$/.test(host)) value = await twitter(u, cookies);
  else if (/(^|\.)bilibili\.com$/.test(host)) value = await bilibili(u, cookies);
  else {
    let local: Source | null = null;
    let err: unknown;
    try {
      local = await html(u, cookies);
    } catch (e) {
      err = e;
    }
    if (!local || thin(local)) local = (await firecrawl(u)) ?? local;
    if (!local) throw err;
    value = local;
  }

  cache.set(key, { at: Date.now(), value });
  return value;
}
