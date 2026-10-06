"use client";
import { Check, Copy, Download, Newspaper } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { post as postJson } from "@/lib/http";
import type { ExportBundle } from "@/lib/export";
import { PLATFORM_SPECS } from "@/lib/platforms";
import type { RewriteResult, Source } from "@/lib/types";
import { cn } from "@/lib/utils";

const Img = ({ src }: { src: string }) => (
  // referrerPolicy: XHS / Bilibili CDNs reject hotlinking with a Referer header
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" className="size-16 rounded-lg border border-line object-cover" />
);

export function SourceCard({ source }: { source: Source }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-4 text-sm">
      <p className="font-medium">{source.title || source.url}</p>
      <p className="mt-0.5 text-xs text-muted">
        {source.author} · {source.images.length} 图 · {source.videos.length} 视频
      </p>
      <p className="mt-2 line-clamp-3 text-muted">{source.text}</p>
      {source.images.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">{source.images.slice(0, 6).map((s) => <Img key={s} src={s} />)}</div>
      )}
    </div>
  );
}

/** One tab per platform; one click copies title + body. */
export function PostTabs({ result }: { result: RewriteResult }) {
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const [wx, setWx] = useState(false);
  const post = result.posts[i];
  if (!post) return null;
  const text = post.title ? `${post.title}\n\n${post.body}` : post.body;

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const exportBundle = () => postJson<ExportBundle>("/api/export", result);

  async function copyWechat() {
    const { wechat_html } = await exportBundle();
    // Modern path: ClipboardItem (Chrome / Safari / Firefox 127+); ignored by WeChat's in-app browser.
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([wechat_html], { type: "text/html" }),
            "text/plain": new Blob([wechat_html.replace(/<[^>]+>/g, "")], { type: "text/plain" }),
          }),
        ]);
        setWx(true);
        setTimeout(() => setWx(false), 1500);
        return;
      } catch {}
    }
    // Legacy fallback: works everywhere including WeChat's in-app browser.
    const ta = document.createElement("textarea");
    ta.value = wechat_html;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    setWx(true);
    setTimeout(() => setWx(false), 1500);
  }

  async function downloadZip() {
    const [{ default: JSZip }, bundle] = await Promise.all([import("jszip"), exportBundle()]);
    const zip = new JSZip();
    bundle.files.forEach((f) => zip.file(f.name, f.content));
    // Images are best-effort: most CDNs block cross-origin reads, media.txt lists every URL anyway.
    await Promise.all(
      result.media.images.map(async (src, n) => {
        try {
          const r = await fetch(src);
          if (r.ok) zip.file(`images/${n + 1}.${(r.headers.get("content-type") ?? "").split("/")[1]?.split(";")[0] || "jpg"}`, await r.blob());
        } catch {}
      }),
    );
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mediaforge-export.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    // iOS Safari: revoke too soon cancels the download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card">
      <div className="flex flex-wrap items-center gap-1 border-b border-line p-2">
        {result.posts.map((p, idx) => (
          <button
            key={p.platform}
            onClick={() => setI(idx)}
            className={cn("rounded-md px-2.5 py-1 text-sm text-muted", idx === i && "bg-line text-fg")}
          >
            {PLATFORM_SPECS[p.platform].label}
          </button>
        ))}
        <span className="ml-auto" />
        {result.posts.some((p) => p.platform === "wechat") && (
          <Button size="sm" variant="ghost" onClick={copyWechat}>
            {wx ? <Check className="size-3.5" /> : <Newspaper className="size-3.5" />}
            {wx ? "已复制" : "复制到公众号"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={downloadZip}>
          <Download className="size-3.5" />
          ZIP
        </Button>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
      <div className="p-4 text-sm leading-relaxed">
        {post.title && <p className="mb-2 font-medium">{post.title}</p>}
        <p className="whitespace-pre-wrap">{post.body}</p>
        <p className="mt-3 text-xs text-muted">
          {text.length} / {PLATFORM_SPECS[post.platform].limit}
        </p>
        {(result.media.images.length > 0 || result.media.videos.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {result.media.images.map((s) => <Img key={s} src={s} />)}
            {result.media.videos.map((v) => (
              <a key={v} href={v} target="_blank" rel="noreferrer" className="text-xs text-accent underline">
                视频 ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
