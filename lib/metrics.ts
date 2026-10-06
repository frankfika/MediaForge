/** In-memory usage counters, mirrored to .data/metrics.json. Node is single-threaded, so `+= 1` is atomic. Relative imports only. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const KEYS = ["rewrites", "composes", "learns", "refines", "exports", "embeds", "fetches"] as const;
export type Metric = (typeof KEYS)[number];
export type Snapshot = Record<Metric, number>;

const file = () => process.env.METRICS_FILE ?? ".data/metrics.json";
const zero = (): Snapshot => Object.fromEntries(KEYS.map((k) => [k, 0])) as Snapshot;

let counts: Snapshot | null = null;
function load(): Snapshot {
  if (counts) return counts;
  counts = zero();
  try {
    const saved = JSON.parse(readFileSync(file(), "utf8")) as Partial<Snapshot>;
    for (const k of KEYS) if (Number.isFinite(saved[k])) counts[k] = saved[k]!;
  } catch {} // missing or corrupt file: start from zero
  return counts;
}

export function inc(k: Metric): void {
  load()[k] += 1;
  try {
    mkdirSync(dirname(file()), { recursive: true });
    writeFileSync(file(), JSON.stringify(counts));
  } catch {} // read-only FS (serverless): counters stay in memory
}

export const snapshot = (): Snapshot => ({ ...load() });

/** Drop the in-memory state so the next call reloads from disk (tests). */
export const reset = (): void => void (counts = null);
