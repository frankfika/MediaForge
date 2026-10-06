import { z } from "zod";
import { fetchLink } from "@/lib/fetcher";
import { route } from "@/lib/http";
import { learnStyle } from "@/lib/llm";
import { inc } from "@/lib/metrics";
import type { Style } from "@/lib/types";

export const maxDuration = 120;

// Each sample is either a URL (fetched) or raw text.
export const POST = route(
  z.object({ name: z.string().min(1).max(60), samples: z.array(z.string().min(1)).min(1).max(10) }),
  async ({ name, samples }): Promise<Style> => {
    const texts = await Promise.all(samples.map(async (s) => (/^https?:\/\/\S+$/.test(s.trim()) ? (await fetchLink(s.trim())).text : s)));
    const { prompt, features } = await learnStyle(texts);
    inc("learns");
    return { id: crypto.randomUUID(), name, prompt, features, version: 1 };
  },
);
