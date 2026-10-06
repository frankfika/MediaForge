"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { setActiveStyle, useStyles } from "@/lib/styles-store";
import { useT } from "@/lib/use-t";
import type { Key } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LINKS: { href: string; label: Key }[] = [
  { href: "/", label: "nav.chat" },
  { href: "/rewrite", label: "nav.rewrite" },
  { href: "/editor", label: "nav.editor" },
  { href: "/styles", label: "nav.styles" },
  { href: "/search", label: "nav.search" },
  { href: "/settings", label: "nav.settings" },
  { href: "/showcase", label: "nav.showcase" },
];

export function Nav() {
  const t = useT();
  const path = usePathname();
  const { styles, active } = useStyles();
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-3xl items-center gap-1 px-4">
        <Link href="/" className="mr-3 font-semibold tracking-tight">
          MediaForge
        </Link>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn("rounded-md px-2.5 py-1 text-sm text-muted transition hover:text-fg", path === l.href && "bg-line text-fg")}
          >
            {t(l.label)}
          </Link>
        ))}
        <select
          aria-label={t("nav.activeStyle")}
          value={active?.id ?? ""}
          onChange={(e) => setActiveStyle(e.target.value || null)}
          className="ml-auto max-w-36 rounded-md border border-line bg-card px-2 py-1 text-xs text-muted"
        >
          <option value="">{t("nav.defaultStyle")}</option>
          {styles.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
