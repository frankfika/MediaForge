/**
 * Tiny "started at" tracking for /api/health. The process boot time is
 * captured lazily on first call so unit tests that import health.ts
 * without booting the process still get a reasonable value.
 */
let startedAt: number | null = null;

/** Unix ms when the Node process started. */
export function processStartedAt(): number {
  if (startedAt === null) startedAt = Date.now();
  return startedAt;
}

/** Seconds since the process started. */
export function uptimeSeconds(): number {
  return Math.max(0, Math.floor((Date.now() - processStartedAt()) / 1000));
}

/** Build SHA / commit hash exposed at /api/health. Read once at module init. */
export const buildSha: string = (() => {
  // Vercel sets VERCEL_GIT_COMMIT_SHA; pnpm build + Vercel preview also
  // expose it. For local dev the env var is unset; we fall back to
  // a short marker so dashboards don't display "unknown".
  return process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? "dev";
})();

/** Build timestamp (ms) — pulled from SOURCE_DATE_EPOCH (deterministic) or
 *  the container start. Used by /api/health to show build recency.
 */
export const buildTimestamp: number = (() => {
  const sde = process.env.SOURCE_DATE_EPOCH;
  if (sde && /^\d+$/.test(sde)) return Number(sde) * 1000;
  return processStartedAt();
})();
