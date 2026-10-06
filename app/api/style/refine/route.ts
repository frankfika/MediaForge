import { z } from "zod";
import { route } from "@/lib/http";
import { refineStyle } from "@/lib/llm";
import { StyleRefSchema, type Style } from "@/lib/types";

export const maxDuration = 60;

// Evidence is explicit `feedback`, an original->edited pair, or both.
export const POST = route(
  z
    .object({
      style: StyleRefSchema,
      feedback: z.string().max(1000).optional(),
      original: z.string().optional(),
      edited: z.string().optional(),
    })
    .refine((b) => b.feedback || (b.original && b.edited), "Provide feedback or original+edited"),
  async ({ style, ...evidence }) => {
    const { prompt, changelog } = await refineStyle({ style, ...evidence });
    return { style: { ...style, prompt, version: style.version + 1 } satisfies Style, changelog };
  },
);
