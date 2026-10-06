"use client";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { post } from "@/lib/http";
import { removeStyle, setActiveStyle, upsertStyle, useStyles } from "@/lib/styles-store";
import type { Style } from "@/lib/types";

function StyleCard({ style, isActive }: { style: Style; isActive: boolean }) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function refine() {
    setBusy(true);
    try {
      const r = await post<{ style: Style; changelog: string[] }>("/api/style/refine", { style, feedback });
      upsertStyle({ ...r.style, features: style.features });
      setFeedback("");
      setNote(r.changelog.join(";"));
    } catch (e) {
      setNote(e instanceof Error ? e.message : "失败了");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-4 text-sm">
      <div className="flex items-center gap-2">
        <p className="font-medium">{style.name}</p>
        <span className="text-xs text-muted">v{style.version}</span>
        <Button size="sm" variant={isActive ? "primary" : "outline"} className="ml-auto" onClick={() => setActiveStyle(style.id)}>
          {isActive ? "使用中" : "使用"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => removeStyle(style.id)}>删除</Button>
      </div>
      {style.features && (
        <p className="mt-2 text-xs text-muted">
          句长 ≈ {style.features.avgSentenceLength} · {style.features.rhythm} · {style.features.vocabulary.slice(0, 5).join(" / ")}
        </p>
      )}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted">查看风格 Prompt</summary>
        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed">{style.prompt}</p>
      </details>
      <div className="mt-3 flex gap-2">
        <input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="哪里不像?例如「太正式,多用短句和反问」" className="h-9 flex-1 rounded-lg border border-line bg-transparent px-3 text-sm outline-none focus:border-accent" />
        <Button size="sm" className="h-9" onClick={refine} disabled={busy || !feedback}>
          {busy && <Loader2 className="size-3.5 animate-spin" />}修正
        </Button>
      </div>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}

export default function StylesPage() {
  const { styles, active } = useStyles();
  const [name, setName] = useState("");
  const [samples, setSamples] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function learn() {
    setBusy(true);
    setError("");
    try {
      // one sample per block; blocks separated by a line containing only ---. A block that is a single URL is fetched.
      const list = samples.split(/^\s*---\s*$/m).map((s) => s.trim()).filter(Boolean);
      upsertStyle(await post<Style>("/api/style/learn", { name, samples: list }));
      setName("");
      setSamples("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "失败了");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">风格</h1>
      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-dashed border-line p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="风格名,例如「我的公众号」" className="h-10 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-accent" />
        <textarea value={samples} onChange={(e) => setSamples(e.target.value)} rows={6} placeholder={"贴 3–5 篇样本:文章链接或正文。\n多篇之间用单独一行 --- 分隔。"} className="rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent" />
        <Button onClick={learn} disabled={busy || !name || !samples.trim()} className="self-start">
          {busy && <Loader2 className="size-4 animate-spin" />}学习这个风格
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      {styles.map((s) => (
        <StyleCard key={s.id} style={s} isActive={active?.id === s.id} />
      ))}
      {styles.length === 0 && <p className="text-center text-sm text-muted">还没有风格。贴几篇你喜欢的文章,让 AI 学一学。</p>}
    </div>
  );
}
