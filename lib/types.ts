import type { UIMessage, UIDataTypes } from "ai";
import { z } from "zod";

export const PLATFORMS = ["wechat", "x", "xhs", "bilibili"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const PlatformSchema = z.enum(PLATFORMS);

/** Normalized result of fetching any link. */
export const SourceSchema = z.object({
  url: z.string(),
  title: z.string(),
  author: z.string(),
  text: z.string(),
  images: z.array(z.string()),
  videos: z.array(z.string()),
});
export type Source = z.infer<typeof SourceSchema>;

/** What the model produces for one platform. Media is never model-generated. */
export const PlatformPostSchema = z.object({
  platform: PlatformSchema,
  title: z.string().optional().describe("Omit for platforms without titles (x)"),
  body: z.string(),
});
export type PlatformPost = z.infer<typeof PlatformPostSchema>;

export type RewriteResult = {
  media: Pick<Source, "images" | "videos">;
  posts: PlatformPost[];
};

/** Machine-readable voice fingerprint extracted from samples. */
export const StyleProfileSchema = z.object({
  features: z.object({
    avgSentenceLength: z.number().describe("Approx. characters (zh) or words (en) per sentence"),
    vocabulary: z.array(z.string()).describe("Signature words / phrases, max 12"),
    rhythm: z.string().describe("One sentence on pacing, e.g. 'short-short-long'"),
    devices: z.array(z.string()).describe("Rhetorical habits: questions, analogies, lists, ..."),
    taboos: z.array(z.string()).describe("Things this author never does"),
  }),
  prompt: z.string().describe("Self-contained system prompt that reproduces this voice, <= 400 words"),
});
export type StyleProfile = z.infer<typeof StyleProfileSchema>;

/** What the server needs per request (server is stateless w.r.t. styles in the MVP). */
export const StyleRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
  version: z.number().int().default(1),
});
export type StyleRef = z.infer<typeof StyleRefSchema>;

export type Style = StyleRef & { features?: StyleProfile["features"] };

/** Typed tool I/O for the chat agent — drives exhaustive rendering on the client. */
export type ChatTools = {
  fetch_link: { input: { url: string }; output: Source };
  rewrite_post: {
    input: { url: string; platforms: Platform[]; instruction?: string };
    output: RewriteResult;
  };
};
export type ChatMessage = UIMessage<unknown, UIDataTypes, ChatTools>;
