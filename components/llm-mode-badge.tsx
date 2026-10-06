"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Sticky corner badge: is the server talking to Claude or the deterministic mock? */
export function LlmModeBadge() {
  const [mode, setMode] = useState<"mock" | "anthropic" | null>(null);
  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then((j: { mode: "mock" | "anthropic" }) => setMode(j.mode)).catch(() => setMode(null));
  }, []);
  if (!mode) return null;
  return (
    <span
      className={cn(
        "pointer-events-none fixed bottom-1.5 right-2 z-50 rounded-full px-2 py-0.5 text-[10px] font-medium",
        mode === "mock" ? "bg-line text-muted" : "bg-green-500/15 text-green-600",
      )}
    >
      {mode === "mock" ? "LLM: mock" : "LLM: Claude Sonnet 4.5"}
    </span>
  );
}
