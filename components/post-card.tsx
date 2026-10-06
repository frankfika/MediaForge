"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  const post = result.posts[i];
  if (!post) return null;
  const text = post.title ? `${post.title}\n\n${post.body}` : post.body;

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card">
      <div className="flex items-center gap-1 border-b border-line p-2">
        {result.posts.map((p, idx) => (
          <button
            key={p.platform}
            onClick={() => setI(idx)}
            className={cn("rounded-md px-2.5 py-1 text-sm text-muted", idx === i && "bg-line text-fg")}
          >
            {PLATFORM_SPECS[p.platform].label}
          </button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={copy}>
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
