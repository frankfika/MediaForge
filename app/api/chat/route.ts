import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { CHAT_SYSTEM, model, rewrite, styleSystem } from "@/lib/ai";
import { fetchLink } from "@/lib/fetcher";
import { route } from "@/lib/http";
import { PlatformSchema, StyleRefSchema } from "@/lib/types";

export const maxDuration = 60;

export const POST = route(
  z.object({ messages: z.array(z.custom<UIMessage>()), style: StyleRefSchema.nullish() }),
  async ({ messages, style }) => {
    const result = streamText({
      model: model(),
      system: `${CHAT_SYSTEM}\n\n${styleSystem(style)}`,
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(6),
      tools: {
        fetch_link: tool({
          description: "Fetch a tweet / Xiaohongshu / Bilibili / WeChat / article URL and return title, author, text, images, videos.",
          inputSchema: z.object({ url: z.string().url() }),
          execute: ({ url }) => fetchLink(url),
        }),
        rewrite_post: tool({
          description: "Rewrite a previously fetched link for the chosen platforms in the active style. The UI renders the result.",
          inputSchema: z.object({
            url: z.string().url(),
            platforms: z.array(PlatformSchema).min(1),
            instruction: z.string().optional(),
          }),
          execute: async ({ url, platforms, instruction }) =>
            rewrite({ source: await fetchLink(url), platforms, style, instruction }),
        }),
      },
    });
    return result.toUIMessageStreamResponse();
  },
);
