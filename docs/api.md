# API Contract

Base: `/api`。JSON,UTF-8。入参均经 zod 校验(`lib/http.ts#route`)。
错误统一:`{ "error": string }`,状态码 `400`(校验失败)/`500`(上游或内部错误)。
类型源:`lib/types.ts`。

## 公共类型

```ts
type Platform = "wechat" | "x" | "xhs" | "bilibili";
type Source = { url: string; title: string; author: string; text: string; images: string[]; videos: string[] };
type PlatformPost = { platform: Platform; title?: string; body: string };
type RewriteResult = { media: { images: string[]; videos: string[] }; posts: PlatformPost[] };
type StyleRef = { id: string; name: string; prompt: string; version?: number };
type Style = StyleRef & { version: number; features?: { avgSentenceLength: number; vocabulary: string[]; rhythm: string; devices: string[]; taboos: string[] } };
```

## POST `/api/chat` — 对话 agent(流式)

AI SDK v5 `UIMessage` 流(SSE)。客户端用 `useChat`,请求体:

```json
{ "messages": [UIMessage], "style": StyleRef | null }
```

Agent 工具:`fetch_link({url}) → Source`,`rewrite_post({url, platforms, instruction?}) → RewriteResult`。最多 6 步。

## POST `/api/rewrite` — 改写模式

```jsonc
// 请求:url 与 source 二选一
{ "url": "https://x.com/a/status/1",           // 或
  "source": Source,                            // 如编辑器草稿
  "platforms": ["xhs", "wechat"],              // ≥1
  "style": StyleRef | null,
  "instruction": "更口语一点" }                // ≤500 字,可选
// 200
{ "source": Source, "media": { "images": [], "videos": [] }, "posts": [PlatformPost] }
```

媒体来自 `source`,**原样**返回,模型不参与。

## POST `/api/compose` — 创作模式(文本流)

```jsonc
{ "prompt": "AI 编程助手的下一步",              // useCompletion 约定字段名
  "links": ["https://…"],                      // ≤5,可选;抓取失败静默跳过
  "style": StyleRef | null }
// 200: text/plain 流,Markdown,首行 "# 标题"
```

## POST `/api/style/learn` — 学习风格

```jsonc
{ "name": "我的号",
  "samples": ["https://…", "正文文本…"] }       // 1–10;单条为 URL 则抓取,否则当正文
// 200: Style (v1);id 由服务端生成,持久化由客户端/Phase 2 服务端负责
```

## POST `/api/style/refine` — 修正风格

```jsonc
{ "style": StyleRef,
  "feedback": "太正式,多用反问",                // feedback 或 (original+edited) 至少其一
  "original": "AI 写的稿", "edited": "我改后的稿" }
// 200
{ "style": Style /* version+1 */, "changelog": ["更短句", "去掉总结段"] }
```

## Phase 2 预留

`GET/POST /api/styles`、`GET /api/styles/:id/versions`、`POST /api/styles/:id/rollback`、`POST /api/export`(返回 ZIP)、`GET /api/media?url=`(防盗链代理)。
