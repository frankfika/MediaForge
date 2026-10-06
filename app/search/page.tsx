"use client";
import { useEffect, useState } from "react";
import { post } from "@/lib/http";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";

const DOCS = [
  "MediaForge 把一篇文章改写成公众号、小红书、X 和 B 站四个平台的版本。",
  "风格学习:贴几篇样本,AI 提炼句长、节奏和标志词,生成可复用的写作风格。",
  "导出为 Markdown 或 HTML,一键复制到公众号编辑器。",
  "MCP 服务让 Claude Desktop 直接调用改写与风格工具。",
  "没有 API key 时自动使用 mock LLM,本地即可完整体验。",
];

type SearchResponse = {
  provider: string;
  model: string;
  results: { text: string; score: number }[];
};

export default function SearchPage() {
  const t = useT();
  const [query, setQuery] = useState("怎么改写文章");
  const [data2, setData2] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [vecs, setVecs] = useState<number[][] | null>(null);

  useEffect(() => {
    // Debounce so typing doesn't fire a request per keystroke.
    const timer = setTimeout(() => {
      post<SearchResponse>("/api/search", { query, corpus: DOCS, topK: DOCS.length })
        .then((res) => {
          setData2(res);
          setError("");
          // Re-fetch raw vectors only when the user opens a card so the page
          // stays light on initial load.
          if (picked !== null)
            post<{ embeddings: number[][] }>("/api/embed", { texts: DOCS }).then(({ embeddings }) => setVecs(embeddings));
        })
        .catch((e) => setError(e instanceof Error ? e.message : "failed"));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, picked]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">{t("search.title")}</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t("search.query")}
        placeholder={t("search.placeholder")}
        className="h-10 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-accent"
      />
      <p className="text-xs text-muted">{t("search.note")}</p>
      {data2 && (
        <p className="text-[10px] uppercase tracking-wider text-muted">
          {data2.provider} · {data2.model}
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <ul className="flex flex-col gap-2">
        {data2?.results.map((d, i) => (
          <li key={i}>
            <button
              data-testid="doc-card"
              onClick={() => setPicked(picked === i ? null : i)}
              className={cn(
                "w-full rounded-[var(--radius-card)] border bg-card p-4 text-left text-sm",
                picked === i ? "border-accent" : "border-line",
              )}
            >
              <span className="mr-2 font-mono text-xs text-muted tabular-nums">{d.score.toFixed(3)}</span>
              {d.text}
            </button>
            {picked === i && vecs && (
              <p data-testid="doc-vec" className="mt-1 break-all font-mono text-xs text-muted">
                {vecs[i]?.length} dims: [{vecs[i]?.map((n) => n.toFixed(2)).join(", ")}]
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
