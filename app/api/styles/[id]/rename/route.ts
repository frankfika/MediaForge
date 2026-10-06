import { renameStyle, styleRoute } from "@/lib/styles-db";
import { RenameStyleRequestSchema } from "@/lib/types";

export const POST = styleRoute(RenameStyleRequestSchema, ({ db, userId, id, body }) => renameStyle(db, userId, id, body.name));
