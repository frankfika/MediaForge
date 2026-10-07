/**
 * Lightweight liveness checks for /api/health. Pure functions, relative imports only.
 *
 * Each check returns { ok, detail? }. They never throw; a failure is
 * captured as ok:false + a short reason so /api/health can render
 * the snapshot without scraping log files.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

type Check = { ok: boolean; detail?: string };

/** Returns true if the metrics file path is writable. */
export function metricsFileWritable(): Check {
  const path = process.env.METRICS_FILE ?? ".data/metrics.json";
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, readFileSync(path, "utf8") /* unchanged */ || "{}");
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "unknown" };
  }
}

/** Try a no-op Postgres round-trip. Caller passes a db handle (Drizzle). */
export async function postgresPing(db: { select: () => unknown } | null): Promise<Check> {
  if (!db) return { ok: false, detail: "DATABASE_URL not set" };
  try {
    // Tiny round-trip; any error from the underlying driver is surfaced.
    await (db as unknown as { select: () => Promise<unknown> }).select();
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "query failed" };
  }
}

/** True if a path is on disk and readable. Used for the metrics.json probe. */
export function pathReadable(p: string): Check {
  try {
    return existsSync(p) ? { ok: true } : { ok: false, detail: "missing" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "unknown" };
  }
}
