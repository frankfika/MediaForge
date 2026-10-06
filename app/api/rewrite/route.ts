import { z } from "zod";
import { rewrite } from "@/lib/ai";
import { fetchLink } from "@/lib/fetcher";
import { route } from "@/lib/http";
import { PlatformSchema, SourceSchema, StyleRefSchema } from "@/lib/types";

export const maxDuration = 60;

// Rewrite mode: give a `url` (fetched for you) or a ready-made `source` (e.g. the editor draft).
export const POST = route(
  z
    .object({
      url: z.string().url().optional(),
      source: SourceSchema.optional(),
      platforms: z.array(PlatformSchema).min(1),
      style: StyleRefSchema.nullish(),
      instruction: z.string().max(500).optional(),
    })
    .refine((b) => b.url || b.source, "Provide url or source"),
  async ({ url, source, platforms, style, instruction }) => {
    const src = source ?? (await fetchLink(url!));
    return { source: src, ...(await rewrite({ source: src, platforms, style, instruction })) };
  },
);
