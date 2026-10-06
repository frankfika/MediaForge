"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/use-t";

const THEMES = ["light", "dark", "system"] as const;
type Theme = (typeof THEMES)[number];
const KEY = "mediaforge.theme";
const listeners = new Set<() => void>();

const read = (): Theme => {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "system";
};
/** "system" = no attribute, so the prefers-color-scheme media query in globals.css decides. */
const apply = (t: Theme) =>
  t === "system" ? document.documentElement.removeAttribute("data-theme") : document.documentElement.setAttribute("data-theme", t);
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** Mounted in the root layout: re-applies the stored theme after hydration (the inline script in layout.tsx prevents the first-paint flash). */
export function ThemeInit() {
  useEffect(() => apply(read()), []);
  return null;
}

export function ThemeToggle() {
  const tr = useT();
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  function set(t: Theme) {
    t === "system" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, t);
    apply(t);
    listeners.forEach((l) => l());
  }
  return (
    <div role="group" aria-label={tr("settings.theme")} className="flex gap-2">
      {THEMES.map((t) => (
        <Button key={t} size="sm" variant={theme === t ? "primary" : "outline"} aria-pressed={theme === t} onClick={() => set(t)}>
          {tr(`theme.${t}`)}
        </Button>
      ))}
    </div>
  );
}
