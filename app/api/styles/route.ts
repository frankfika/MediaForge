import { createStyle, listStyles, styleRoute } from "@/lib/styles-db";
import { CreateStyleRequestSchema } from "@/lib/types";

export const GET = styleRoute(null, ({ db, userId }) => listStyles(db, userId));
export const POST = styleRoute(CreateStyleRequestSchema, ({ db, userId, body }) => createStyle(db, userId, body));
