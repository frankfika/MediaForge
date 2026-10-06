import { refineStyle } from "@/lib/llm";
import { addVersion, getStyle, styleRoute } from "@/lib/styles-db";
import { FeedbackRequestSchema } from "@/lib/types";

export const maxDuration = 60;

// feedback / original->edited -> refine -> append a new version. Uses the mock LLM when no ANTHROPIC_API_KEY.
export const POST = styleRoute(FeedbackRequestSchema, async ({ db, userId, id, body }) => {
  const cur = await getStyle(db, userId, id);
  if (!cur) return null;
  const { prompt, changelog } = await refineStyle({
    style: { id, name: cur.name, prompt: cur.prompt, version: cur.currentVersion },
    ...body,
  });
  const style = await addVersion(db, userId, id, { prompt, changelog });
  return style && { style, changelog };
});
