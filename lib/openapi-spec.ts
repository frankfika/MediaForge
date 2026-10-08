// OpenAPI 3.1 spec literal. Hand-written so it stays in lock-step with
// the zod schemas in lib/types.ts. Served at /api/openapi.json and
// rendered at /docs via Stoplight Elements.
export const openapiSpec = {
  openapi: "3.1.0",
  info: {
    title: "MediaForge API",
    version: "0.1.0",
    description:
      "AI-native multi-platform writing. Rewrite a link, compose an article, learn a style, score text against a style, and export platform-native posts.",
    license: { name: "MIT", url: "https://github.com/frankfika/MediaForge/blob/main/LICENSE" },
  },
  servers: [
    { url: "http://localhost:3000", description: "Local dev (pnpm dev)" },
    { url: "https://<your-deployment>.vercel.app", description: "Vercel deployment" },
  ],
  tags: [
    { name: "Chat" },
    { name: "Rewrite" },
    { name: "Compose" },
    { name: "Export" },
    { name: "Style" },
    { name: "Styles" },
    { name: "Embed" },
    { name: "Search" },
    { name: "Metrics" },
    { name: "Health" },
    { name: "Ops" },
  ],
  components: {
    securitySchemes: {
      UserIdHeader: { type: "apiKey" as const, in: "header" as const, name: "x-user-id" },
    },
    schemas: {
      Platform: { type: "string" as const, enum: ["wechat", "x", "xhs", "bilibili"] },
      Source: {
        type: "object" as const,
        required: ["url", "title", "author", "text", "images", "videos"],
        properties: {
          url: { type: "string" as const },
          title: { type: "string" as const },
          author: { type: "string" as const },
          text: { type: "string" as const },
          images: { type: "array" as const, items: { type: "string" as const } },
          videos: { type: "array" as const, items: { type: "string" as const } },
        },
      },
      PlatformPost: {
        type: "object" as const,
        required: ["platform", "body"],
        properties: {
          platform: { $ref: "#/components/schemas/Platform" },
          title: { type: "string" as const },
          body: { type: "string" as const },
        },
      },
      StyleVersion: {
        type: "object" as const,
        required: ["version", "prompt", "createdAt"],
        properties: {
          version: { type: "integer" as const },
          prompt: { type: "string" as const },
          features: { type: "object" as const, nullable: true },
          changelog: { type: "array" as const, nullable: true, items: { type: "string" as const } },
          createdAt: { type: "string" as const, format: "date-time" },
        },
      },
      ApiStyle: {
        type: "object" as const,
        required: ["id", "name", "currentVersion", "prompt", "createdAt"],
        properties: {
          id: { type: "string" as const, format: "uuid" },
          name: { type: "string" as const },
          currentVersion: { type: "integer" as const },
          prompt: { type: "string" as const },
          features: {},
          createdAt: { type: "string" as const, format: "date-time" },
          versions: { type: "array" as const, items: { $ref: "#/components/schemas/StyleVersion" } },
        },
      },
      Problem: {
        type: "object" as const,
        required: ["error"],
        properties: {
          error: { type: "string" as const },
          code: { type: "string" as const },
        },
      },
    },
    parameters: {
      UserId: {
        in: "header" as const,
        name: "x-user-id",
        required: false as boolean,
        schema: { type: "string" as const, format: "uuid" as const },
      },
    },
    responses: {
      BadRequest: { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/Problem" } } } },
      NotFound: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Problem" } } } },
      NoDb: { description: "DATABASE_URL unset", content: { "application/json": { schema: { $ref: "#/components/schemas/Problem" } } } },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Service health + LLM provider mode",
        responses: { "200": { description: "ok", content: { "application/json": { schema: { type: "object" as const } } } } },
      },
    },
    "/api/metrics": {
      get: {
        tags: ["Metrics"],
        summary: "In-memory usage counters",
        responses: { "200": { description: "ok", content: { "application/json": { schema: { type: "object" as const } } } } },
      },
    },
    "/api/chat": {
      post: {
        tags: ["Chat"],
        summary: "Streaming AI chat (tool-use loop)",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" as const } } } },
        responses: {
          "200": { description: "UIMessage stream", content: { "text/event-stream": { schema: { type: "string" as const } } } },
        },
      },
    },
    "/api/global-chat": {
      post: {
        tags: ["Chat"],
        summary: "Same as /api/chat (used by ⌘K drawer)",
        responses: {
          "200": { description: "UIMessage stream", content: { "text/event-stream": { schema: { type: "string" as const } } } },
        },
      },
    },
    "/api/rewrite": {
      post: {
        tags: ["Rewrite"],
        summary: "Paste a link to platform-native posts",
        description:
          "URL is fetched in-process (X fxtwitter, Bilibili view API, WeChat /js_content, Readability fallback). Without ANTHROPIC_API_KEY the response uses the deterministic mock LLM.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" as const },
              example: {
                url: "https://x.com/jack/status/20",
                platforms: ["wechat", "x", "xhs", "bilibili"],
                style: { id: "00000000-0000-4000-8000-000000000001", name: "极简技术流", prompt: "短句为主", version: 1 },
                instruction: "保留代码块和链接",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "rewrite result",
            content: {
              "application/json": {
                schema: { type: "object" as const },
                example: {
                  source: {
                    url: "https://x.com/jack/status/20",
                    title: "first tweet",
                    author: "jack",
                    text: "just setting up my twttr",
                    images: [],
                    videos: [],
                  },
                  media: { images: [], videos: [] },
                  posts: [
                    { platform: "wechat", title: "第一条推文的诞生", body: "2006 年 3 月 21 日,Twitter 诞生了..." },
                    { platform: "x", body: "第一条推文改写版:Twitter 诞生记 (140 字符)" },
                    { platform: "xhs", title: "✨ Twitter 诞生记", body: "姐妹们!你们知道 Twitter..." },
                    { platform: "bilibili", title: "【Twitter 诞生记】", body: "本期讲讲 Twitter 是怎么来的..." },
                  ],
                },
              },
            },
          },
          "400": { description: "missing url/source" },
        },
      },
    },
    "/api/compose": {
      post: {
        tags: ["Compose"],
        summary: "Topic + reference links to long-form draft",
        description: "Streams a Markdown long-form draft; combine with /api/rewrite's pass to adapt to each platform.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" as const },
              example: {
                prompt: "AI 编程助手的下一步会是什么",
                links: ["https://example.com/some-article"],
                style: { id: "00000000-0000-4000-8000-000000000002", name: "公众号深度评论", prompt: "反常识开篇,层层递进", version: 1 },
              },
            },
          },
        },
        responses: { "200": { description: "text/plain stream", content: { "text/plain": { schema: { type: "string" as const } } } } },
      },
    },
    "/api/export": {
      post: {
        tags: ["Export"],
        summary: "WeChat inline HTML + per-platform Markdown + ZIP-ready files",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" as const } } } },
        responses: { "200": { description: "bundle", content: { "application/json": { schema: { type: "object" as const } } } } },
      },
    },
    "/api/style/learn": {
      post: {
        tags: ["Style"],
        summary: "Extract a style prompt from samples (URLs or raw text)",
        description: "URLs in samples are fetched + Readability-stripped; raw text is used directly.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" as const },
              example: {
                name: "我的公众号",
                samples: ["https://myblog.com/post-1", "https://myblog.com/post-2", "我写公众号 5 年了,核心是讲故事。"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "new style",
            content: {
              "application/json": {
                schema: { type: "object" as const },
                example: {
                  id: "00000000-0000-4000-8000-000000000099",
                  name: "我的公众号",
                  prompt: "用讲故事的方式打开每一段;不堆形容词,先讲一个具体场景,再提炼观点。",
                  features: {
                    avgSentenceLength: 22,
                    vocabulary: ["故事", "场景", "提炼", "反常识"],
                    rhythm: "medium sentences with occasional short",
                    devices: ["anecdote", "contrast"],
                    taboos: ["cliché openers", "hyperbole"],
                  },
                  version: 1,
                },
              },
            },
          },
        },
      },
    },
    "/api/style/refine": {
      post: {
        tags: ["Style"],
        summary: "Refine a style from feedback and/or original/edited pair",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" as const } } } },
        responses: { "200": { description: "refined style", content: { "application/json": { schema: { type: "object" as const } } } } },
      },
    },
    "/api/style/judge": {
      post: {
        tags: ["Style"],
        summary: "Heuristically score a text against a style",
        description:
          "Returns 5 weighted signals (sentence length, vocabulary overlap, rhythm match, sentence count, taboo compliance), a 0-100 score, and a feedback string. Weights are in lib/style-judge.ts#WEIGHTS.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" as const },
              example: {
                style: { id: "00000000-0000-4000-8000-000000000001", name: "极简技术流", prompt: "短句为主。", version: 1 },
                sampleText: "结论先行。本质是取舍。实现成本很低。边界要写清楚。",
                referenceTexts: ["结论先行。本质是取舍。实现成本很低。边界要写清楚。", "取舍决定成本。结论很简单。"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "score",
            content: {
              "application/json": {
                schema: { type: "object" as const },
                example: {
                  score: 84,
                  signals: {
                    sentenceLength: 0.98,
                    vocabularyOverlap: 0.34,
                    rhythmMatch: 1.0,
                    sentenceCountMatch: 0.8,
                    tabooCompliance: 1.0,
                  },
                  feedback: "很像(84 分)。最弱项「词汇重叠」34%:高频词几乎不重合,多用参考样本里的标志词。",
                },
              },
            },
          },
        },
      },
    },
    "/api/styles": {
      get: {
        tags: ["Styles"],
        summary: "List styles (Postgres)",
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { type: "array" as const, items: { $ref: "#/components/schemas/ApiStyle" } },
                example: [
                  {
                    id: "00000000-0000-4000-8000-000000000001",
                    name: "极简技术流",
                    currentVersion: 2,
                    prompt: "短句为主。",
                    createdAt: "2026-10-06T16:00:00.000Z",
                  },
                  {
                    id: "00000000-0000-4000-8000-000000000002",
                    name: "公众号深度评论",
                    currentVersion: 1,
                    prompt: "反常识开篇。",
                    createdAt: "2026-10-06T16:30:00.000Z",
                  },
                ],
              },
            },
          },
          "503": { $ref: "#/components/responses/NoDb" },
        },
      },
      post: {
        tags: ["Styles"],
        summary: "Create or upsert a style",
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" as const } } } },
        responses: {
          "200": { description: "ok", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiStyle" } } } },
          "503": { $ref: "#/components/responses/NoDb" },
        },
      },
    },
    "/api/embed": {
      post: {
        tags: ["Embed"],
        summary: "Mock 64-dim embeddings (or OpenAI text-embedding-3-small)",
        description:
          "Without OPENAI_API_KEY, returns 64-dim hash-seeded vectors. With the key, calls /v1/embeddings and returns the native dim.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" as const },
              example: { texts: ["hello world", "foo bar"] },
            },
          },
        },
        responses: {
          "200": {
            description: "vectors",
            content: {
              "application/json": {
                schema: { type: "object" as const },
                example: {
                  embeddings: [
                    [0.001, -0.5, 0.3],
                    [0.4, -0.2, 0.1],
                  ],
                  provider: "mock",
                  model: "mock-fnv1a",
                  dim: 64,
                },
              },
            },
          },
        },
      },
    },
    "/api/embed/{query}": {
      get: {
        tags: ["Embed"],
        summary: "GET retrieval: ranked similarity over corpus",
        parameters: [{ in: "path" as const, name: "query", required: true, schema: { type: "string" as const } }],
        responses: { "200": { description: "ranked", content: { "application/json": { schema: { type: "object" as const } } } } },
      },
    },
    "/api/search": {
      post: {
        tags: ["Search"],
        summary: "Semantic search over a corpus with deterministic ranking",
        description:
          "Returns topK results sorted by cosineSim against the query embedding. With OPENAI_API_KEY the embeddings come from /v1/embeddings.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" as const },
              example: {
                query: "怎么改写",
                corpus: ["改写是核心", "风格学习", "完全不相关"],
                topK: 3,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "ranked",
            content: {
              "application/json": {
                schema: { type: "object" as const },
                example: {
                  provider: "mock",
                  model: "mock-fnv1a",
                  results: [
                    { text: "改写是核心", score: 0.82 },
                    { text: "风格学习", score: -0.15 },
                    { text: "完全不相关", score: -0.31 },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/api/openapi.json": {
      get: {
        tags: ["Ops"],
        summary: "This document",
        responses: { "200": { description: "ok", content: { "application/json": { schema: { type: "object" as const } } } } },
      },
    },
    "/api/ping": {
      get: {
        tags: ["Ops"],
        summary: "Trivial liveness probe (always 200, no metrics, no DB, no LLM)",
        description:
          "Use for load-balancer / uptime-monitor health checks. The response is always 200; richer service-level status lives at /api/health.",
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { type: "object" as const },
                example: { pong: true, at: "2026-10-08T14:00:00.000Z" },
              },
            },
          },
        },
      },
    },
    "/mcp-guide.md": {
      get: {
        tags: ["Ops"],
        summary: "Markdown guide for the stdio MCP server",
        responses: { "200": { description: "ok", content: { "text/markdown": { schema: { type: "string" as const } } } } },
      },
    },
  },
};
