import { z } from "zod";
import { generateEmbeddings } from "@/lib/embed";
import { route } from "@/lib/http";

// Anthropic has no embeddings API, so every mode (with or without a key) returns the deterministic mock vectors.
export const POST = route(z.object({ texts: z.array(z.string().max(8000)).max(100) }), async ({ texts }) => ({
  embeddings: generateEmbeddings(texts),
}));
