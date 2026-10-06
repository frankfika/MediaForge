"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getXhsCookie, setXhsCookie } from "@/lib/cookie";
import { LOCALES } from "@/lib/i18n";
import { setLocale, useLocale, useT } from "@/lib/use-t";

export default function SettingsPage() {
  const t = useT();
  const locale = useLocale();
  const [cookie, setCookie] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => setCookie(getXhsCookie() ?? ""), []);

  function save() {
    setXhsCookie(cookie);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
      <section className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-card p-4 text-sm">
        <p className="font-medium">{t("settings.theme")}</p>
        <ThemeToggle />
      </section>
      <section className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-card p-4 text-sm">
        <p className="font-medium">{t("settings.language")}</p>
        <div role="group" aria-label={t("settings.language")} className="flex gap-2">
          {LOCALES.map((l) => (
            <Button
              key={l}
              size="sm"
              variant={locale === l ? "primary" : "outline"}
              aria-pressed={locale === l}
              onClick={() => setLocale(l)}
            >
              {t(`lang.${l}`)}
            </Button>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-card p-4 text-sm">
        <label htmlFor="xhs" className="font-medium">
          {t("settings.cookie")} <span className="font-normal text-muted">{t("settings.optional")}</span>
        </label>
        <textarea
          id="xhs"
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          rows={3}
          placeholder="web_session=…; a1=…"
          className="rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-accent"
        />
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={save}>
            {t("settings.save")}
          </Button>
          {saved && <span className="text-xs text-muted">{t("settings.saved")}</span>}
        </div>
        <p className="text-xs leading-relaxed text-muted">
          {t("settings.cookieHelp")}
          <br />
          {t("settings.cookieHonest")}
        </p>
      </section>
    </div>
  );
}
