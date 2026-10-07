import { getStyle, styleRoute } from "@/lib/styles-db";

// Semantic alias: GET /api/styles/{id}/history returns the version history
// (newest first). Functionally identical to GET /api/styles/{id}, but
// its existence lets frontend code say `fetch(.../history)` clearly.
export const GET = styleRoute(null, async ({ db, userId, id }) => {
  const style = await getStyle(db, userId, id);
  if (!style) return null;
  return { versions: style.versions ?? [] };
});
