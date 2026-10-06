"use client";
import { useCompletion } from "@ai-sdk/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { PlatformPicker } from "@/components/platform-picker";
import { PostTabs } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { post } from "@/lib/http";
import { upsertStyle, useStyles } from "@/lib/styles-store";
import type { Platform, RewriteResult, Style } from "@/lib/types";

export default function EditorPage() {
  const { active } = useStyles();
  const [topic, setTopic] = useState("");
  const [links, setLinks] = useState("");
  const [edited, setEdited] = useState<string | null>(null); // null = user hasn't touched the AI draft
  const [platforms, setPlatforms] = useState<Platform[]>(["wechat"]);
  const [out, setOut] = useState<RewriteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const { completion, complete, isLoading, error } = useCompletion({ api: "/api/compose", streamProtocol: "text" });
  const draft = edited ?? completion;

  const generate = () => {
    setEdited(null);
    setOut(null);
    setNote("");
    void complete(topic, { body: { links: links.split(/\s+/).filter(Boolean), style: active } });
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "失败了");
    } finally {
      setBusy(false);
    }
  };

  const adapt = () =>
    run(async () => {
      const source = { url: "", title: "", author: "", text: draft, images: [], videos: [] };
      setOut(await post("/api/rewrite", { source, platforms, style: active }));
    });

  const learnFromEdits = () =>
    run(async () => {
      if (!active) return;
      const r = await post<{ style: Style; changelog: string[] }>("/api/style/refine", { style: active, original: completion, edited: draft });
      upsertStyle(r.style);
      setNote(`风格已更新到 v${r.style.version}:${r.changelog.join(";")}`);
    });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">创作</h1>
      <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="话题或一句话 brief" className="h-11 rounded-xl border border-line bg-card px-4 text-sm outline-none focus:border-accent" />
      <textarea value={links} onChange={(e) => setLinks(e.target.value)} rows={2} placeholder="参考链接(可选,空格或换行分隔,最多 5 个)" className="rounded-xl border border-line bg-card px-4 py-2 text-sm outline-none focus:border-accent" />
      <Button onClick={generate} disabled={isLoading || !topic} className="self-start">
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        生成初稿
      </Button>
      {error && <p className="text-sm text-red-500">{error.message}</p>}

      {(draft || isLoading) && (
        <>
          <textarea value={draft} onChange={(e) => setEdited(e.target.value)} rows={16} className="rounded-xl border border-line bg-card p-4 text-sm leading-relaxed outline-none focus:border-accent" />
          <PlatformPicker value={platforms} onChange={setPlatforms} />
          <div className="flex gap-2">
            <Button onClick={adapt} disabled={busy || isLoading || platforms.length === 0}>适配平台</Button>
            <Button variant="outline" onClick={learnFromEdits} disabled={busy || !active || edited === null || edited === completion} title={active ? "" : "先在「风格」页创建并选择一个风格"}>
              从我的修改中学习
            </Button>
          </div>
        </>
      )}
      {note && <p className="text-sm text-muted">{note}</p>}
      {out && <PostTabs result={out} />}
    </div>
  );
}
