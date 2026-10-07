"use client";
import { Chat } from "@/components/chat";
import { Brush, Feather, LayoutGrid, PenLine, Search, Settings, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/use-t";
import type { Key } from "@/lib/i18n";

type Metrics = Record<string, number>;

const ZERO_STATS: Metrics = { rewrites: 0, composes: 0, learns: 0, refines: 0, exports: 0, embeds: 0, fetches: 0 };

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Quick({ icon: Icon, title, desc, href }: { icon: LucideIcon; title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      data-testid="dashboard-quick"
      className="group flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-card p-5 transition hover:border-accent"
    >
      <Icon className="size-5 text-accent transition group-hover:scale-110" aria-hidden />
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted">{desc}</span>
    </Link>
  );
}

const QUICKS: { icon: LucideIcon; titleKey: Key; descKey: Key; href: string }[] = [
  { icon: PenLine, titleKey: "dashboard.quickRewrite.title", descKey: "dashboard.quickRewrite.desc", href: "/rewrite" },
  { icon: Feather, titleKey: "dashboard.quickCompose.title", descKey: "dashboard.quickCompose.desc", href: "/editor" },
  { icon: Brush, titleKey: "dashboard.quickStyles.title", descKey: "dashboard.quickStyles.desc", href: "/styles" },
  { icon: Search, titleKey: "dashboard.quickSearch.title", descKey: "dashboard.quickSearch.desc", href: "/search" },
  { icon: LayoutGrid, titleKey: "dashboard.quickShowcase.title", descKey: "dashboard.quickShowcase.desc", href: "/showcase" },
  { icon: Settings, titleKey: "dashboard.quickSettings.title", descKey: "dashboard.quickSettings.desc", href: "/settings" },
];

/** Home dashboard: metrics strip + 6 quick actions. Metrics refresh every 30 s. */
export function Dashboard() {
  const t = useT();
  const [stats, setStats] = useState<Metrics>(ZERO_STATS);
  useEffect(() => {
    let cancelled = false;
    const fetchOnce = () =>
      fetch("/api/metrics")
        .then((r) => (r.ok ? r.json() : null))
        .then((j: Metrics | null) => !cancelled && j && setStats(j))
        .catch(() => {});
    fetchOnce();
    const id = setInterval(fetchOnce, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="dashboard-metrics">
        <Metric label={t("dashboard.metrics.rewrites")} value={stats.rewrites ?? 0} />
        <Metric label={t("dashboard.metrics.composes")} value={stats.composes ?? 0} />
        <Metric label={t("dashboard.metrics.learns")} value={stats.learns ?? 0} />
        <Metric label={t("dashboard.metrics.exports")} value={stats.exports ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICKS.map((q) => (
          <Quick key={q.href} icon={q.icon} title={t(q.titleKey)} desc={t(q.descKey)} href={q.href} />
        ))}
      </div>

      <Link
        href="/showcase"
        className="flex items-center justify-center gap-2 self-start rounded-full border border-line px-4 py-2 text-xs text-muted transition hover:text-fg"
      >
        <Sparkles className="size-3.5" aria-hidden />
        <span data-testid="dashboard-try">Open the component playground</span>
      </Link>

      <section className="mt-2 border-t border-line pt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted">或者直接开始</h2>
        <Chat />
      </section>
    </div>
  );
}
