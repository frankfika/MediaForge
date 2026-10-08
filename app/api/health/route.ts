import pkg from "@/package.json";
import { getDb } from "@/lib/db/client";
import { metricsFileWritable, pathReadable, postgresPing } from "@/lib/health";
import { llmMode } from "@/lib/llm";
import { buildSha, buildTimestamp, uptimeSeconds } from "@/lib/uptime";

export const dynamic = "force-dynamic";

const ENDPOINTS = [
  "chat",
  "global-chat",
  "rewrite",
  "compose",
  "export",
  "embed",
  "embed/{query}",
  "metrics",
  "search",
  "style/learn",
  "style/refine",
  "style/judge",
  "styles",
  "styles/{id}",
  "styles/{id}/duplicate",
  "styles/{id}/rename",
  "styles/{id}/export",
  "styles/{id}/history",
  "openapi.json",
  "ping",
  "health",
  "mcp-guide.md",
].map((p) => (p.includes("{") ? `/api/${p}` : `/api/${p}`));

const METRICS_FILE = process.env.METRICS_FILE ?? ".data/metrics.json";

export const GET = async () => {
  const db = getDb();
  const [postgres, metricsFile, metricsExists] = await Promise.all([
    postgresPing(db),
    Promise.resolve(metricsFileWritable()),
    Promise.resolve(pathReadable(METRICS_FILE)),
  ]);
  const services = { postgres, metricsFile, metricsExists };
  // The route is up as long as the Next process can answer — that's the
  // signal Playwright (and uptime monitors) care about. Per-service
  // status is reported in the body; a 200 doesn't claim Postgres is
  // healthy. Status is 200 unless the metrics file is completely
  // missing AND we cannot keep it in memory (a real misconfiguration).
  const ok = metricsFile.ok;
  const status = metricsFile.ok ? 200 : 503;
  return Response.json(
    {
      ok,
      version: pkg.version,
      build: { sha: buildSha, builtAt: new Date(buildTimestamp).toISOString() },
      uptime: uptimeSeconds(),
      mode: llmMode(),
      endpoints: ENDPOINTS,
      services,
    },
    { status },
  );
};
