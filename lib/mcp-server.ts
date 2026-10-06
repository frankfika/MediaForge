/** MediaForge as an MCP server (stdio). Tools call lib/llm, which is a deterministic mock unless ANTHROPIC_API_KEY is set. */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchLink } from "./fetcher";
import { compose, learnStyle, llmMode, refineStyle, rewrite } from "./llm";
import { PlatformSchema, StyleRefSchema, type Style } from "./types";

const json = (v: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify({ llm: llmMode(), ...(v as object) }, null, 2) }],
});
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }] });
const safe =
  <A>(fn: (a: A) => Promise<unknown>) =>
  async (a: A) => {
    try {
      return json(await fn(a));
    } catch (e) {
      return fail(e);
    }
  };

const style = StyleRefSchema.partial({ id: true, version: true })
  .optional()
  .describe("Style to write in: {name, prompt}, as returned by learn_style");
const asRef = (s?: { id?: string; name: string; prompt: string; version?: number }) =>
  s && { id: s.id ?? "mcp", name: s.name, prompt: s.prompt, version: s.version ?? 1 };

export function createServer() {
  const server = new McpServer({ name: "mediaforge", version: "0.1.0" });

  server.registerTool(
    "rewrite_url",
    {
      description:
        "Fetch a link (X, Xiaohongshu, Bilibili, WeChat, any article) and rewrite it for the given platforms. Media is passed through untouched.",
      inputSchema: {
        url: z.string().url(),
        platforms: z.array(PlatformSchema).min(1).describe("wechat | x | xhs | bilibili"),
        style,
        instruction: z.string().max(500).optional(),
        xhs_cookie: z.string().optional().describe("Xiaohongshu login cookie for login-walled notes (best effort)"),
      },
    },
    safe(async ({ url, platforms, style, instruction, xhs_cookie }) => {
      const source = await fetchLink(url, { xhs: xhs_cookie });
      return { source, ...(await rewrite({ source, platforms, style: asRef(style), instruction })) };
    }),
  );

  server.registerTool(
    "compose_post",
    {
      description: "Write an original article (Markdown) or a single-platform post from a topic, optionally grounded in reference links.",
      inputSchema: {
        topic: z.string().min(1).max(2000),
        platform: PlatformSchema.optional().describe("Omit for a long-form Markdown article"),
        links: z.array(z.string().url()).max(5).optional(),
        style,
      },
    },
    safe(async ({ topic, platform, links = [], style }) => {
      const references = (await Promise.allSettled(links.map((l) => fetchLink(l)))).flatMap((r) =>
        r.status === "fulfilled" ? [r.value] : [],
      );
      return { text: await compose({ topic, platform, style: asRef(style), references }) };
    }),
  );

  server.registerTool(
    "learn_style",
    {
      description:
        "Learn a writing style from samples (URLs or raw text). Returns a Style whose `prompt` can be passed to the other tools.",
      inputSchema: { name: z.string().min(1).max(60), samples: z.array(z.string().min(1)).min(1).max(10) },
    },
    safe(async ({ name, samples }) => {
      const texts = await Promise.all(samples.map(async (s) => (/^https?:\/\/\S+$/.test(s.trim()) ? (await fetchLink(s.trim())).text : s)));
      const { prompt, features } = await learnStyle(texts);
      return { style: { id: crypto.randomUUID(), name, prompt, features, version: 1 } satisfies Style };
    }),
  );

  server.registerTool(
    "refine_style",
    {
      description: "Refine a style from feedback and/or an original->edited pair. Returns the next version plus a changelog.",
      inputSchema: {
        style: StyleRefSchema.partial({ id: true, version: true }),
        feedback: z.string().max(1000).optional(),
        original: z.string().optional(),
        edited: z.string().optional(),
      },
    },
    safe(async ({ style, ...evidence }) => {
      if (!evidence.feedback && !(evidence.original && evidence.edited)) throw new Error("Provide feedback or original+edited");
      const ref = asRef(style)!;
      const { prompt, changelog } = await refineStyle({ style: ref, ...evidence });
      return { style: { ...ref, prompt, version: ref.version + 1 } satisfies Style, changelog };
    }),
  );

  return server;
}

export const serve = () => createServer().connect(new StdioServerTransport());
