"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Mode = "mock" | "anthropic";

export function LlmModePill({ mode, className }: { mode: Mode; className?: string }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", mode === "mock" ? "bg-line text-muted" : "bg-green-500/15 text-green-600", className)}>
      {mode === "mock" ? "LLM: mock" : "LLM: Claude Sonnet 4.5"}
    </span>
  );
}

/** Sticky corner badge: is the server talking to Claude or the deterministic mock? */
export function LlmModeBadge() {
  const [mode, setMode] = useState<Mode | null>(null);
  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then((j: { mode: Mode }) => setMode(j.mode)).catch(() => setMode(null));
  }, []);
  if (!mode) return null;
  return <LlmModePill mode={mode} className="pointer-events-none fixed bottom-1.5 right-2 z-50" />;
}
