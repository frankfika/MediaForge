import { duplicateStyle, styleRoute } from "@/lib/styles-db";
import { DuplicateStyleRequestSchema } from "@/lib/types";

export const POST = styleRoute(DuplicateStyleRequestSchema, ({ db, userId, id, body }) => duplicateStyle(db, userId, id, body.name));
