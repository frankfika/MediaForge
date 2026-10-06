"use client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { post } from "@/lib/http";
import { setActiveStyle, useStyles } from "@/lib/styles-store";
import { deleteStyle, history, migrate, refine as refineStyle, rollback, saveStyle, setMode, syncNow, useStylesDb } from "@/lib/styles-sync";
import type { Style, StyleVersion } from "@/lib/types";

/** Storage mode switch, manual sync, degrade warning and the inline "upload local styles" prompt. */
function StorageBar() {
  const { mode, busy, warning, pending, migrationDismissed, dismissWarning, dismissMigration } = useStylesDb();
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-card p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">存储</span>
        {(["local", "db"] as const).map((m) => (
          <Button key={m} size="sm" variant={mode === m ? "primary" : "outline"} disabled={busy} onClick={() => setMode(m)}>
            {m === "local" ? "本地" : "云端 (Postgres)"}
          </Button>
        ))}
        {mode === "db" && (
          <Button size="sm" variant="ghost" className="ml-auto" disabled={busy} onClick={syncNow}>
            {busy && <Loader2 className="size-3.5 animate-spin" />}立即同步
          </Button>
        )}
      </div>
      {warning && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
          {warning}
          <button className="ml-auto underline" onClick={dismissWarning}>知道了</button>
        </p>
      )}
      {mode === "db" && pending.length > 0 && !migrationDismissed && (
        <p className="flex items-center gap-2 rounded-lg bg-line px-3 py-2 text-xs">
          本地有 {pending.length} 个风格尚未上传到云端({pending.map((s) => s.name).join("、")})。
          <Button size="sm" className="ml-auto h-7" disabled={busy} onClick={migrate}>上传到云端</Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={dismissMigration}>稍后</Button>
        </p>
      )}
    </div>
  );
}

function History({ id, current, onRollback }: { id: string; current: number; onRollback: (v: number) => void }) {
  const [versions, setVersions] = useState<StyleVersion[] | null>(null);
  useEffect(() => void history(id).then((v) => setVersions(v ?? null)), [id, current]);
  if (!versions) return null;
  return (
    <ul className="mt-2 flex flex-col gap-1.5 text-xs">
      {versions.map((v) => (
        <li key={v.version} className="rounded-lg border border-line p-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">v{v.version}</span>
            <span className="text-muted">{new Date(v.createdAt).toLocaleString()}</span>
            {v.version === current ? (
              <span className="ml-auto text-muted">当前</span>
            ) : (
              <Button size="sm" variant="outline" className="ml-auto h-6 px-2 text-xs" onClick={() => onRollback(v.version)}>回滚到此版本</Button>
            )}
          </div>
          {v.changelog?.map((c) => <p key={c} className="mt-1 text-muted">{c}</p>)}
          <details className="mt-1">
            <summary className="cursor-pointer text-muted">Prompt</summary>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{v.prompt}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}

function StyleCard({ style, isActive }: { style: Style; isActive: boolean }) {
  const { inCloud } = useStylesDb();
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function refine() {
    setBusy(true);
    try {
      setNote((await refineStyle(style, feedback)).join(";"));
      setFeedback("");
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
        <Button size="sm" variant="ghost" onClick={() => deleteStyle(style.id)}>删除</Button>
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
      {inCloud(style.id) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted">版本历史</summary>
          <History id={style.id} current={style.version} onRollback={(v) => rollback(style.id, v).catch((e) => setNote(e instanceof Error ? e.message : "回滚失败"))} />
        </details>
      )}
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
      await saveStyle(await post<Style>("/api/style/learn", { name, samples: list }));
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
      <StorageBar />
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
