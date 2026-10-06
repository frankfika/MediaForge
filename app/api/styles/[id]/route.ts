import { deleteStyle, getStyle, styleRoute } from "@/lib/styles-db";

export const GET = styleRoute(null, ({ db, userId, id }) => getStyle(db, userId, id));
export const DELETE = styleRoute(null, async ({ db, userId, id }) => ((await deleteStyle(db, userId, id)) ? { ok: true } : null));
