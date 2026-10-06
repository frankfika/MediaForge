import { expect, test } from "@playwright/test";

const DOCS = [
  "MediaForge 把一篇文章改写成公众号、小红书、X 和 B 站四个平台的版本。",
  "风格学习:贴几篇样本,AI 提炼句长、节奏和标志词,生成可复用的写作风格。",
  "导出为 Markdown 或 HTML,一键复制到公众号编辑器。",
  "MCP 服务让 Claude Desktop 直接调用改写与风格工具。",
  "没有 API key 时自动使用 mock LLM,本地即可完整体验。",
];

test("POST /api/search: deterministic ranking + provider metadata + topK", async ({ request }) => {
  const res = await request.post("/api/search", {
    data: { query: "怎么改写文章", corpus: DOCS, topK: 3 },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as {
    provider: string;
    model: string;
    results: { text: string; score: number }[];
  };
  expect(["mock", "anthropic"]).toContain(body.provider);
  expect(["mock-fnv1a", "text-embedding-3-small"]).toContain(body.model);
  expect(body.results).toHaveLength(3);
  for (const r of body.results) {
    expect(r.score).toBeGreaterThanOrEqual(-1);
    expect(r.score).toBeLessThanOrEqual(1);
    expect(DOCS).toContain(r.text);
  }
  // scores should be sorted desc
  for (let i = 1; i < body.results.length; i++) {
    expect(body.results[i - 1]!.score).toBeGreaterThanOrEqual(body.results[i]!.score);
  }
});

test("POST /api/search: validates body (empty query / empty corpus)", async ({ request }) => {
  const empty = await request.post("/api/search", { data: { query: "", corpus: DOCS } });
  expect(empty.status()).toBe(400);

  const noCorpus = await request.post("/api/search", { data: { query: "x", corpus: [] } });
  expect(noCorpus.status()).toBe(400);
});
