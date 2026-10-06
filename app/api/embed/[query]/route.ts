import { cosineSim, generateEmbeddingsAuto, parseEmbedQs } from "@/lib/embed";
import { inc } from "@/lib/metrics";

export const maxDuration = 30;

/** Default corpus when ?corpus= is absent: the five MediaForge one-liners. */
const DEFAULT_CORPUS = [
  "MediaForge 把一篇文章改写成公众号、小红书、X 和 B 站四个平台的版本。",
  "风格学习:贴几篇样本,AI 提炼句长、节奏和标志词,生成可复用的写作风格。",
  "导出为 Markdown 或 HTML,一键复制到公众号编辑器。",
  "MCP 服务让 Claude Desktop 直接调用改写与风格工具。",
  "没有 API key 时自动使用 mock LLM,本地即可完整体验。",
];

// GET /api/embed/[query]?corpus=a,b,c&topK=5 — retrieval over a comma-separated corpus (or the 5 default docs).
export async function GET(req: Request, ctx: { params: Promise<{ query: string }> }): Promise<Response> {
  const query = (await ctx.params).query.trim();
  if (!query || query.length > 2000) return Response.json({ error: "query must be 1..2000 chars" }, { status: 400 });
  const parsed = parseEmbedQs(new URL(req.url).search);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  inc("embeds");
  const corpus = parsed.corpus ?? DEFAULT_CORPUS;
  const { vectors, provider, model } = await generateEmbeddingsAuto([query, ...corpus]);
  const [q, ...docs] = vectors;
  const results = corpus
    .map((text, i) => ({ text, score: cosineSim(q ?? [], docs[i] ?? []) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, parsed.topK);
  return Response.json({ provider, model, query, results });
}
