import { z } from "zod";
import { cosineSim, generateEmbeddingsAuto } from "@/lib/embed";
import { route } from "@/lib/http";
import { inc } from "@/lib/metrics";

export const maxDuration = 30;

// Top-N semantic ranking; mock embeddings unless OPENAI_API_KEY is set.
export const POST = route(
  z.object({
    query: z.string().min(1).max(2000),
    corpus: z.array(z.string().min(1).max(8000)).min(1).max(200),
    topK: z.number().int().positive().max(50).default(5),
  }),
  async ({ query, corpus, topK }) => {
    inc("embeds");
    const { vectors, provider, model } = await generateEmbeddingsAuto([query, ...corpus]);
    const [q, ...docs] = vectors;
    const ranked = corpus
      .map((text, i) => ({ text, score: cosineSim(q ?? [], docs[i] ?? []) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return { provider, model, results: ranked };
  },
);
