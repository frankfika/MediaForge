"use client";
import { useMemo, useSyncExternalStore } from "react";
import type { Style } from "./types";

// MVP persistence: localStorage. Server stays stateless (style prompt travels with each request).
// Swap for the Drizzle-backed API in docs/data-model.md without touching callers.
type State = { styles: Style[]; active: string | null };
const KEY = "mediaforge.styles";
const EMPTY = JSON.stringify({ styles: [], active: null } satisfies State);
const listeners = new Set<() => void>();

const read = () => localStorage.getItem(KEY) ?? EMPTY;
const parse = (): State => JSON.parse(read()) as State;
function write(next: State) {
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
};

export const upsertStyle = (s: Style) => {
  const { styles, active } = parse();
  write({ styles: styles.some((x) => x.id === s.id) ? styles.map((x) => (x.id === s.id ? s : x)) : [...styles, s], active: active ?? s.id });
};
export const removeStyle = (id: string) => {
  const { styles, active } = parse();
  write({ styles: styles.filter((s) => s.id !== id), active: active === id ? null : active });
};
export const setActiveStyle = (id: string | null) => write({ ...parse(), active: id });

export function useStyles() {
  const raw = useSyncExternalStore(subscribe, read, () => EMPTY);
  return useMemo(() => {
    const { styles, active } = JSON.parse(raw) as State;
    return { styles, active: styles.find((s) => s.id === active) ?? null };
  }, [raw]);
}
