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
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" as const } } } },
        responses: { "200": { description: "rewrite result", content: { "application/json": { schema: { type: "object" as const } } } } },
      },
    },
    "/api/compose": {
      post: {
        tags: ["Compose"],
        summary: "Topic + reference links to long-form draft",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" as const } } } },
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
        summary: "Extract a style prompt from samples",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" as const } } } },
        responses: { "200": { description: "new style", content: { "application/json": { schema: { type: "object" as const } } } } },
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
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" as const } } } },
        responses: { "200": { description: "score", content: { "application/json": { schema: { type: "object" as const } } } } },
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
            content: { "application/json": { schema: { type: "array" as const, items: { $ref: "#/components/schemas/ApiStyle" } } } },
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
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" as const } } } },
        responses: { "200": { description: "vectors", content: { "application/json": { schema: { type: "object" as const } } } } },
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
        summary: "Semantic search over a corpus",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" as const } } } },
        responses: { "200": { description: "ranked", content: { "application/json": { schema: { type: "object" as const } } } } },
      },
    },
    "/api/openapi.json": {
      get: {
        tags: ["Ops"],
        summary: "This document",
        responses: { "200": { description: "ok", content: { "application/json": { schema: { type: "object" as const } } } } },
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
