import { z } from "zod";
import { route } from "@/lib/http";
import { judgeStyle, synthesizeText } from "@/lib/style-judge";
import { StyleProfileSchema, StyleRefSchema } from "@/lib/types";

// Deterministic, no LLM. With no referenceTexts the style's own features are synthesized into a reference.
export const POST = route(
  z.object({
    style: StyleRefSchema.extend({ features: StyleProfileSchema.shape.features.optional() }),
    sampleText: z.string().min(1).max(20000),
    referenceTexts: z.array(z.string()).max(10).default([]),
  }),
  async ({ style, sampleText, referenceTexts }) =>
    judgeStyle({ style, sampleText, referenceTexts: referenceTexts.some((r) => r.trim()) ? referenceTexts : [synthesizeText(style)] }),
);
