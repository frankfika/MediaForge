import { streamText } from "ai";
import { z } from "zod";
import { model, styleSystem } from "@/lib/ai";
import { fetchLink } from "@/lib/fetcher";
import { compose, llmMode } from "@/lib/llm";
import { route } from "@/lib/http";
import { StyleRefSchema } from "@/lib/types";

export const maxDuration = 120;

// Compose mode: topic (+ optional reference links) -> streamed long-form draft in the active style.
export const POST = route(
  z.object({
    prompt: z.string().min(1).max(2000), // `prompt` is the field useCompletion sends
    links: z.array(z.string().url()).max(5).optional(),
    style: StyleRefSchema.nullish(),
  }),
  async ({ prompt, links = [], style }) => {
    const refs = (await Promise.allSettled(links.map((l) => fetchLink(l)))).flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    // no API key: deterministic mock draft (sent as one text chunk; useCompletion handles it the same)
    if (llmMode() === "mock")
      return new Response(await compose({ topic: prompt, references: refs, style }), {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    const result = streamText({
      model: model(),
      system: `${styleSystem(style)}\n\nWrite an original long-form article in Markdown with a title line (# ...). Ground claims in the references when given; never invent facts or quotes.`,
      prompt: `Topic: ${prompt}\n\n${refs
        .map((r) => `<reference url="${r.url}" title="${r.title}">\n${r.text.slice(0, 6000)}\n</reference>`)
        .join("\n")}`,
    });
    return result.toTextStreamResponse();
  },
);
