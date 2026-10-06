"use client";
import { useEffect, useState } from "react";
import { post } from "@/lib/http";
import { cosineSim } from "@/lib/embed";
import { cn } from "@/lib/utils";

const DOCS = [
  "MediaForge 把一篇文章改写成公众号、小红书、X 和 B 站四个平台的版本。",
  "风格学习:贴几篇样本,AI 提炼句长、节奏和标志词,生成可复用的写作风格。",
  "导出为 Markdown 或 HTML,一键复制到公众号编辑器。",
  "MCP 服务让 Claude Desktop 直接调用改写与风格工具。",
  "没有 API key 时自动使用 mock LLM,本地即可完整体验。",
];

export default function SearchPage() {
  const [query, setQuery] = useState("怎么改写文章");
  const [vecs, setVecs] = useState<{ q: number[]; docs: number[][] } | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    // debounce so typing doesn't fire a request per keystroke
    const t = setTimeout(
      () =>
        post<{ embeddings: number[][] }>("/api/embed", { texts: [query, ...DOCS] })
          .then(({ embeddings: [q = [], ...docs] }) => (setVecs({ q, docs }), setError("")))
          .catch((e) => setError(e instanceof Error ? e.message : "失败了")),
      250,
    );
    return () => clearTimeout(t);
  }, [query]);

  const ranked = DOCS.map((text, i) => ({ text, i, score: vecs ? cosineSim(vecs.q, vecs.docs[i] ?? []) : 0 })).sort(
    (a, b) => b.score - a.score,
  );

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">语义搜索</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="查询"
        placeholder="输入查询"
        className="h-10 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-accent"
      />
      <p className="text-xs text-muted">演示用 mock 向量(确定性哈希,非真实语义),排序仅展示流程;接入真实 embedding 后即为语义排序。</p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <ul className="flex flex-col gap-2">
        {ranked.map((d) => (
          <li key={d.i}>
            <button
              data-testid="doc-card"
              onClick={() => setPicked(picked === d.i ? null : d.i)}
              className={cn(
                "w-full rounded-[var(--radius-card)] border bg-card p-4 text-left text-sm",
                picked === d.i ? "border-accent" : "border-line",
              )}
            >
              <span className="mr-2 font-mono text-xs text-muted tabular-nums">{d.score.toFixed(3)}</span>
              {d.text}
            </button>
            {picked === d.i && vecs && (
              <p data-testid="doc-vec" className="mt-1 break-all font-mono text-xs text-muted">
                {vecs.docs[d.i]?.length} dims: [{vecs.docs[d.i]?.map((n) => n.toFixed(2)).join(", ")}]
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
