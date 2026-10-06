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

/** ---- Styles API (Postgres-backed; see app/api/styles) ---- */
export type StyleVersion = {
  version: number;
  prompt: string;
  features?: StyleProfile["features"] | null;
  changelog?: string[] | null;
  createdAt: string;
};

/** A style as stored server-side. `prompt`/`features` mirror the current version; `versions` is only set on single-style GET / mutations. */
export type ApiStyle = {
  id: string;
  name: string;
  currentVersion: number;
  prompt: string;
  features?: StyleProfile["features"] | null;
  createdAt: string;
  versions?: StyleVersion[];
};

export const CreateStyleRequestSchema = z.object({
  id: z.string().uuid().optional(), // client-generated ids are kept so local and cloud copies match
  name: z.string().min(1).max(60),
  prompt: z.string().min(1),
  features: StyleProfileSchema.shape.features.optional(),
});
export type CreateStyleRequest = z.infer<typeof CreateStyleRequestSchema>;

export const DuplicateStyleRequestSchema = z.object({
  name: z.string().min(1).max(60).optional(), // omit to default to "{source name} (copy)"
});
export type DuplicateStyleRequest = z.infer<typeof DuplicateStyleRequestSchema>;

export const RenameStyleRequestSchema = z.object({
  name: z.string().min(1).max(60),
});
export type RenameStyleRequest = z.infer<typeof RenameStyleRequestSchema>;

export const FeedbackRequestSchema = z
  .object({ feedback: z.string().max(1000).optional(), original: z.string().optional(), edited: z.string().optional() })
  .refine((b) => b.feedback || (b.original && b.edited), "Provide feedback or original+edited");
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

export const RollbackRequestSchema = z.object({ version: z.number().int().positive() });
export type RollbackRequest = z.infer<typeof RollbackRequestSchema>;

export const apiToStyle = (a: ApiStyle): Style => ({
  id: a.id,
  name: a.name,
  prompt: a.prompt,
  version: a.currentVersion,
  ...(a.features ? { features: a.features } : {}),
});
