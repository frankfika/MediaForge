"use client";
import { useT } from "@/lib/use-t";
import { PLATFORMS, type Platform } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlatformPicker({ value, onChange }: { value: Platform[]; onChange: (v: Platform[]) => void }) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2">
      {PLATFORMS.map((p) => {
        const on = value.includes(p);
        return (
          <button
            key={p}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== p) : [...value, p])}
            className={cn("rounded-full border border-line px-3 py-1 text-sm text-muted transition", on && "border-fg bg-fg text-bg")}
          >
            {t(`platform.${p}`)}
          </button>
        );
      })}
    </div>
  );
}
