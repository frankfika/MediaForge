/**
 * Link fetcher: URL (X, Xiaohongshu, Bilibili, WeChat, or any article) -> Source.
 * Libraries: linkedom (DOM), @mozilla/readability (article extraction).
 * Twitter goes through the public fxtwitter API; Bilibili through its public view API.
 * Zero framework imports so it runs standalone: `pnpm fetch <url>`.
 */
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import type { Source } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

// ponytail: per-process memo, 5 min. Swap for Vercel KV if cold starts make it useless.
const cache = new Map<string, { at: number; value: Source }>();

// ponytail: hostname check only; DNS-rebinding to private IPs needs a resolver-level guard.
function assertPublic(u: URL) {
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) URLs are supported");
  if (/^(localhost$|0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(u.hostname))
    throw new Error("Private addresses are not allowed");
}

async function get(url: string) {
  assertPublic(new URL(url));
  const res = await fetch(url, {
    headers: { "user-agent": UA, "accept-language": "zh-CN,zh;q=0.9,en;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  assertPublic(new URL(res.url)); // re-check after redirects
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
  return res;
}

async function twitter(u: URL): Promise<Source> {
  const [, user, , id] = u.pathname.split("/"); // /{user}/status/{id}
  if (!user || !id) throw new Error("Not a tweet URL");
  const { tweet } = (await (await get(`https://api.fxtwitter.com/${user}/status/${id}`)).json()) as {
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

async function bilibili(u: URL): Promise<Source> {
  const bvid = u.pathname.match(/BV\w+/)?.[0];
  if (!bvid) throw new Error("Not a Bilibili video URL");
  const { data } = (await (await get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)).json()) as {
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
async function html(u: URL): Promise<Source> {
  const { document } = parseHTML(await (await get(u.href)).text());
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

export async function fetchLink(raw: string): Promise<Source> {
  const hit = cache.get(raw);
  if (hit && Date.now() - hit.at < 300_000) return hit.value;

  const u = new URL(raw);
  assertPublic(u);
  const host = u.hostname.replace(/^www\./, "");

  let value: Source;
  if (/^(b23\.tv|xhslink\.com)$/.test(host)) value = await fetchLink((await get(u.href)).url); // resolve short link
  else if (/^(x|twitter)\.com$/.test(host)) value = await twitter(u);
  else if (/(^|\.)bilibili\.com$/.test(host)) value = await bilibili(u);
  else value = await html(u); // ponytail: XHS often needs login; plug Firecrawl here if og: tags come back empty

  cache.set(raw, { at: Date.now(), value });
  return value;
}
