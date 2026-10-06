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
type Style = StyleRef & {
  version: number;
  features?: { avgSentenceLength: number; vocabulary: string[]; rhythm: string; devices: string[]; taboos: string[] };
};
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
{ "name": "我的号", "samples": ["https://…", "正文文本…"] } // 1–10;单条为 URL 则抓取,否则当正文
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

## `/api/styles/*` — 云端风格(Postgres)

所有路由:需 `DATABASE_URL`,否则 `503 {code:"NO_DB"}`;连接/查询失败 `503 {code:"DB_UNAVAILABLE"}`(客户端据此降级到 localStorage);不存在 `404`。用户由 `x-user-id` 头(uuid,缺省为内置默认用户)标识。

### GET `/api/styles` — 列表

```jsonc
// 200: ApiStyle[]  (不含 versions)
[{ "id": "uuid", "name": "极简技术流", "currentVersion": 2, "prompt": "…", "features": {…} | null, "createdAt": "ISO" }]
```

### POST `/api/styles` — 创建

```jsonc
{ "id": "uuid?", "name": "…", "prompt": "…", "features": {…}? }  // 同 id 重复上传为幂等 no-op
// 200: ApiStyle (含 versions)
```

### GET `/api/styles/:id` — 单个

```jsonc
// 200: ApiStyle + versions: [{ version, prompt, features, changelog, createdAt }]  (新→旧)
```

(同路径 `DELETE` → `{ ok: true }`)

### POST `/api/styles/:id/refine` — 修正并追加版本

```jsonc
{ "feedback": "太正式", "original": "…", "edited": "…" } // feedback 或 original+edited 至少其一,否则 400
// 200: { "style": ApiStyle /* currentVersion = max+1 */, "changelog": ["+ …"] }
```

无 `ANTHROPIC_API_KEY` 时走 mock LLM。

### POST `/api/styles/:id/rollback` — 回滚

```jsonc
{ "version": 1 }
// 200: ApiStyle (currentVersion=1;历史保留,下次 refine 仍是 max+1);版本不存在 404
```

## `GET /api/health`

```jsonc
{ "ok": true, "mode": "mock" | "anthropic", "version": "0.1.0", "endpoints": ["/api/chat", …] }
```

## Phase 2 预留

`GET /api/media?url=`(防盗链代理)、ZIP 流式下载(目前客户端用 jszip 在浏览器打包,服务端可改为流式)、样式 + 模板导入。
