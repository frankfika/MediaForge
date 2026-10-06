import { z } from "zod";
import { diffStyleVersions } from "@/lib/style-diff";
import { getStyle, styleRoute } from "@/lib/styles-db";

// Needs Postgres (versions live there); 503 NO_DB without DATABASE_URL, 404 for unknown style/version.
const pick = ({ version, prompt, features }: { version: number; prompt: string; features?: unknown }) => ({ version, prompt, features });

export const POST = styleRoute(z.object({ from: z.number().int(), to: z.number().int() }), async ({ db, userId, id, body }) => {
  const versions = (await getStyle(db, userId, id))?.versions;
  const from = versions?.find((v) => v.version === body.from);
  const to = versions?.find((v) => v.version === body.to);
  return from && to ? { from: pick(from), to: pick(to), diff: diffStyleVersions(from, to) } : null;
});
