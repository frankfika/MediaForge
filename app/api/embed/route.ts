import { z } from "zod";
import { generateEmbeddingsAuto } from "@/lib/embed";
import { route } from "@/lib/http";
import { inc } from "@/lib/metrics";

// Anthropic has no embeddings API; when OPENAI_API_KEY is unset the route
// returns deterministic mock vectors and labels the provider so the
// /showcase + /search pages can show that this is a placeholder.
export const POST = route(z.object({ texts: z.array(z.string().max(8000)).max(100) }), async ({ texts }) => {
  inc("embeds");
  const { vectors, provider, model, dim } = await generateEmbeddingsAuto(texts);
  return { embeddings: vectors, provider, model, dim };
});
