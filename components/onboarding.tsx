"use client";
import { LayoutGrid, Palette, Plug, Search, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Key } from "@/lib/i18n";
import { useT } from "@/lib/use-t";

const VISITED_KEY = "mediaforge.visited";

const steps: { href: string; icon: LucideIcon; titleKey: Key; descKey: Key; external?: boolean }[] = [
  { href: "/styles", icon: Palette, titleKey: "firstRun.step1.title", descKey: "firstRun.step1.desc" },
  { href: "/search", icon: Search, titleKey: "firstRun.step2.title", descKey: "firstRun.step2.desc" },
  { href: "/showcase", icon: LayoutGrid, titleKey: "firstRun.step3.title", descKey: "firstRun.step3.desc" },
  { href: "/mcp-guide.md", icon: Plug, titleKey: "firstRun.step4.title", descKey: "firstRun.step4.desc", external: true },
];

/** First-visit onboarding card; dismissed via localStorage flag. Hidden during SSR/hydration to avoid flash. */
export function Onboarding() {
  const t = useT();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => setDismissed(localStorage.getItem(VISITED_KEY) === "true"), []);
  if (dismissed) return null;
  const dismiss = () => {
    localStorage.setItem(VISITED_KEY, "true");
    setDismissed(true);
  };
  return (
    <div data-testid="onboarding" className="rounded-[var(--radius-card)] border border-line bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("firstRun.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("firstRun.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={dismiss}>
          {t("firstRun.dismiss")}
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ href, icon: Icon, titleKey, descKey, external }) => {
          const body = (
            <>
              <Icon className="size-4 text-accent" aria-hidden />
              <span className="text-sm font-medium">{t(titleKey)}</span>
              <span className="text-xs text-muted">{t(descKey)}</span>
            </>
          );
          const cls = "flex flex-col gap-1.5 rounded-lg border border-line p-3 transition hover:bg-line";
          return external ? (
            <a key={href} href={href} className={cls}>
              {body}
            </a>
          ) : (
            <Link key={href} href={href} className={cls}>
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
