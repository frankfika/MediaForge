import { rollbackStyle, styleRoute } from "@/lib/styles-db";
import { RollbackRequestSchema } from "@/lib/types";

// Switch the current version back (or forward) to an existing one. History is kept.
export const POST = styleRoute(RollbackRequestSchema, ({ db, userId, id, body }) => rollbackStyle(db, userId, id, body.version));
