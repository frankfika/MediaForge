"use client";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { post } from "@/lib/http";
import { loadDemoStyles, setActiveStyle, useStyles } from "@/lib/styles-store";
import { deleteStyle, history, migrate, refine as refineStyle, rollback, saveStyle, setMode, syncNow, useStylesDb } from "@/lib/styles-sync";
import { downloadStyles, parseImport } from "@/lib/style-transfer";
import { DEMO_TEXTS, SIGNAL_LABELS, type JudgeResult, type Signals } from "@/lib/style-judge";
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

const FEATURE_ROWS = [["vocabulary", "标志词"], ["devices", "修辞习惯"], ["taboos", "禁忌"]] as const;

/** Read-only detail: features cards + latest refine changelog (cloud history only; samples are not stored). */
function StyleDetail({ style, cloud }: { style: Style; cloud: boolean }) {
  const [log, setLog] = useState<string | null>(null);
  useEffect(() => {
    if (!cloud) return;
    history(style.id).then((vs) => setLog(vs?.find((v) => v.changelog?.length)?.changelog?.join(";") ?? null));
  }, [style.id, style.version, cloud]);
  const f = style.features;
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {f ? (
          <>
            <div className="rounded-lg border border-line p-3 text-xs">
              <p className="text-muted">平均句长</p>
              <p className="mt-1 text-lg font-semibold">{f.avgSentenceLength}</p>
            </div>
            <div className="rounded-lg border border-line p-3 text-xs">
              <p className="text-muted">节奏</p>
              <p className="mt-1">{f.rhythm}</p>
            </div>
            {FEATURE_ROWS.map(([k, label]) => (
              <div key={k} className="rounded-lg border border-line p-3 text-xs">
                <p className="text-muted">{label}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {f[k].length ? f[k].map((w) => <span key={w} className="rounded-full bg-line px-2 py-0.5">{w}</span>) : <span className="text-muted">—</span>}
                </div>
              </div>
            ))}
          </>
        ) : (
          <p className="text-xs text-muted sm:col-span-2">这个风格没有特征数据。</p>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">最近修正:{log ?? (cloud ? "暂无" : "仅云端风格记录修正历史")}</p>
    </motion.div>
  );
}

/** Blind-test panel: score a text against the style (deterministic, no LLM). Empty references fall back to the style's own features. */
function JudgePanel({ style }: { style: Style }) {
  const [text, setText] = useState("");
  const [refs, setRefs] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<JudgeResult | null>(null);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const referenceTexts = refs.split(/^\s*---\s*$/m).map((s) => s.trim()).filter(Boolean);
      setResult(await post<JudgeResult>("/api/style/judge", { style, sampleText: text, referenceTexts }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "失败了");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-line p-3">
      <div className="flex flex-wrap gap-1.5">
        {DEMO_TEXTS.map((d) => (
          <Button key={d.label} size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setText(d.text)}>{d.label}</Button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="贴一段待测文本,或点上面的示例" className="rounded-lg border border-line bg-transparent px-3 py-2 text-xs outline-none focus:border-accent" />
      <textarea value={refs} onChange={(e) => setRefs(e.target.value)} rows={2} placeholder="参考样本(可选,多篇用 --- 分隔)。留空则按风格特征合成参考。" className="rounded-lg border border-line bg-transparent px-3 py-2 text-xs outline-none focus:border-accent" />
      <Button size="sm" className="self-start" onClick={run} disabled={busy || !text.trim()}>
        {busy && <Loader2 className="size-3.5 animate-spin" />}开始测评
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {result && (
        <div className="flex flex-col gap-1.5 text-xs">
          <p className="text-2xl font-semibold">{result.score}<span className="ml-1 text-xs font-normal text-muted">/ 100</span></p>
          {(Object.keys(SIGNAL_LABELS) as (keyof Signals)[]).map((k, i) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-16 text-muted">{SIGNAL_LABELS[k]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${Math.round(result.signals[k] * 100)}%` }} transition={{ duration: 0.5, delay: i * 0.08 }} />
              </div>
              <span className="w-9 text-right tabular-nums">{Math.round(result.signals[k] * 100)}%</span>
            </div>
          ))}
          <p className="mt-1 text-muted">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}

/** Export all / paste-to-import. Import upserts by id (same id overwrites), so re-importing never duplicates. */
function TransferBar({ styles }: { styles: Style[] }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  async function run() {
    const list = parseImport(text);
    for (const s of list) await saveStyle(s);
    setMsg(list.length ? `导入了 ${list.length} 个风格` : "没有可导入的风格(JSON 无效或字段不全)");
    if (list.length) setText("");
  }
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-card p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">导入/导出</span>
        <Button size="sm" variant="outline" disabled={!styles.length} onClick={() => downloadStyles(`mediaforge-styles-${new Date().toISOString().slice(0, 10)}.json`, styles)}>导出全部</Button>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="粘贴风格 JSON" aria-label="导入风格 JSON" className="rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-accent" />
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={run} disabled={!text.trim()}>导入</Button>
        {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}

function StyleCard({ style, isActive }: { style: Style; isActive: boolean }) {
  const { inCloud } = useStylesDb();
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [judging, setJudging] = useState(false);

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
        <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "收起" : "展开"}</Button>
        <Button size="sm" variant="ghost" aria-expanded={judging} onClick={() => setJudging(!judging)}>测评</Button>
        <Button size="sm" variant="ghost" onClick={() => downloadStyles(`${style.name}.json`, [style])}>导出</Button>
        <Button size="sm" variant="ghost" onClick={() => deleteStyle(style.id)}>删除</Button>
      </div>
      {style.features && (
        <p className="mt-2 text-xs text-muted">
          句长 ≈ {style.features.avgSentenceLength} · {style.features.rhythm} · {style.features.vocabulary.slice(0, 5).join(" / ")}
        </p>
      )}
      {judging && <JudgePanel style={style} />}
      <AnimatePresence initial={false}>{open && <StyleDetail style={style} cloud={inCloud(style.id)} />}</AnimatePresence>
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
      <div className="flex items-center">
        <h1 className="text-2xl font-semibold tracking-tight">风格</h1>
        <Button size="sm" variant="outline" className="ml-auto" onClick={loadDemoStyles}>加载演示风格</Button>
      </div>
      <StorageBar />
      <TransferBar styles={styles} />
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
