"use client";
import { Link2, Loader2 } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PlatformPicker } from "@/components/platform-picker";
import { PostTabs, SourceCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { XhsHint } from "@/components/xhs-hint";
import { getXhsCookie } from "@/lib/cookie";
import { post } from "@/lib/http";
import { useStyles } from "@/lib/styles-store";
import { useT } from "@/lib/use-t";
import type { Platform, RewriteResult, Source } from "@/lib/types";

export default function RewritePage() {
  const t = useT();
  const { active } = useStyles();
  const [url, setUrl] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["xhs"]);
  const [out, setOut] = useState<(RewriteResult & { source: Source }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    try {
      setOut(await post("/api/rewrite", { url, platforms, style: active, xhsCookie: getXhsCookie() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">{t("rewrite.title")}</h1>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t("rewrite.placeholder")}
        className="h-11 rounded-xl border border-line bg-card px-4 text-sm outline-none focus:border-accent"
      />
      <XhsHint text={url} />
      <PlatformPicker value={platforms} onChange={setPlatforms} />
      <Button onClick={run} disabled={loading || !url || platforms.length === 0} className="self-start">
        {loading && <Loader2 className="size-4 animate-spin" />}
        {t("rewrite.run")}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!out && !loading && !error && <EmptyState icon={Link2} title={t("rewrite.emptyTitle")} hint={t("rewrite.emptyHint")} />}
      {out && (
        <>
          <SourceCard source={out.source} />
          <PostTabs result={out} />
        </>
      )}
    </div>
  );
}
