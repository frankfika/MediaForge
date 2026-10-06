# Architecture

## 1. 总览

```
 Browser (React 19)                      Vercel (Next.js 15)                      External
┌────────────────────┐   UIMessage     ┌──────────────────────────┐
│ Chat  /rewrite     │  stream (SSE)   │ /api/chat   (agent loop) │──▶ Anthropic Claude
│ /editor  /styles   │◀───────────────▶│ /api/rewrite             │
│ localStorage:styles│                 │ /api/compose  (stream)   │      fxtwitter API
└────────────────────┘                 │ /api/style/learn|refine  │      Bilibili view API
                                       │        │                 │──▶   WeChat / XHS HTML
                                       │   lib/ai.ts  lib/fetcher │
                                       └────────┬─────────────────┘
                                                │ (Phase 2)
                                         Neon Postgres (Drizzle)
```

**设计要点**:服务端对"风格"无状态 —— 每次请求携带 `{id,name,prompt,version}`。好处:MVP 无需登录/DB 即可跑通;迁移到 Postgres 时只替换 `styles-store.ts`。

## 2. 前端

- App Router;页面均为薄壳,逻辑在 `components/`。
- 对话:`useChat<ChatMessage>` + `DefaultChatTransport`。`ChatMessage` 带 **typed tools**(`fetch_link`/`rewrite_post` 的 input/output),渲染时 `switch(part.type)` 穷举,工具结果直接变成 `SourceCard` / `PostTabs` 组件 —— "生成式 UI"。
- 状态:无全局状态库。风格用 `useSyncExternalStore` 订阅 localStorage,所有组件(导航风格选择器、各页)自动同步。
- 动画:Motion 仅用于出现/过渡(<200ms),尊重 `prefers-reduced-motion`。

## 3. 后端路由

| 路由 | 类型 | 说明 |
|---|---|---|
| `POST /api/chat` | 流式 agent | 默认入口,tool-use 循环(≤6 步) |
| `POST /api/rewrite` | JSON | 改写模式的确定性入口(URL 或 source) |
| `POST /api/compose` | 文本流 | 创作模式 |
| `POST /api/style/learn` | JSON | 样本 → 风格 |
| `POST /api/style/refine` | JSON | 反馈/手改 → 新版本风格 |

所有路由经 `lib/http.ts#route`:zod 校验 → handler → 统一 `{error}`。
**同一份核心逻辑两个入口**:`lib/ai.ts#rewrite` 既被 `/api/rewrite` 调用,也是 `/api/chat` 里 `rewrite_post` 工具的实现 —— 对话与表单永远行为一致。

## 4. 编排选型

选 **AI SDK v5 tool-use**,不用 LangGraph:流程是"抓取 → 改写"的短线性链,模型自己决定调用顺序即可;没有需要持久化的多分支状态机。当出现长时多步任务(例如"学风格→自动试写→自评→迭代 N 轮",见 style-agent §6)再引入 LangGraph 或 Vercel Workflow。

关键约束:
- 工具只收 `url`、不收正文 —— 避免让模型在 tool-call 里复述长文(省 token、防篡改)。`rewrite_post` 内部走 `fetchLink` 的 5 分钟缓存。
- 工具返回的 `RewriteResult` 只含 `media + posts`,不含原文,下一轮上下文不膨胀。
- Prompt injection:所有外部文本包在 `<source>/<sample>/<reference>` 标签里,system 声明其为 DATA。

## 5. 链接抓取 `lib/fetcher.ts`

```
fetchLink(url)
 ├─ cache(5min) ─ hit → return
 ├─ assertPublic(url)             # 仅 http(s);拒绝 localhost/内网段;重定向后再检查
 ├─ b23.tv / xhslink.com  → 跟随重定向后递归
 ├─ x.com / twitter.com   → api.fxtwitter.com/{user}/status/{id}      (text, photos[], videos[])
 ├─ bilibili.com          → x/web-interface/view?bvid=                 (title, owner, desc, pic; 视频给嵌入播放器 URL)
 └─ 其它(公众号/小红书/文章)→ HTML → #js_content(公众号) | og:* meta(小红书) | Readability(通用)
```

输出统一为 `Source {url,title,author,text,images[],videos[]}`。**媒体不经过 LLM**,原样随结果返回。
已知上限(代码内以 `ponytail:` 注释标注):小红书部分笔记需登录态 → 接入 Firecrawl 兜底;SSRF 只做主机名检查 → 生产需解析级防护;内存缓存在 serverless 冷启动后失效 → KV。

## 6. 风格 Agent

见 [style-agent.md](style-agent.md)。架构上它只是 **一段 system prompt + 元数据**,通过 `styleSystem(style)` 注入到每个生成调用 —— 因此所有模式(对话/改写/创作)天然共享风格。

## 7. 渲染产物(HTML / ZIP)

MVP:每个平台结果 = `{title?, body}` 纯文本,一键复制;媒体显示缩略图。
Phase 2 导出管线(纯函数,`lib/render/*`,输入 `PlatformPost + media`):

| 平台 | 产物 |
|---|---|
| 公众号 | **内联 CSS 的 HTML**(公众号编辑器会剥离 `<style>`),用 `ClipboardItem('text/html')` 复制后直接粘贴到后台,保留排版 |
| X | 纯文本(超 280 自动切 thread) |
| 小红书 | 标题 + 正文 + 话题;图片按顺序编号 |
| B 站 | Markdown/纯文本 |
| 全部 | `fflate` 在浏览器内打包 ZIP:`{platform}.txt|html` + `media/001.jpg…`(服务端经 `/api/media` 代理绕过防盗链) |

## 8. 部署与运维

Vercel(Fluid compute,路由 `maxDuration` 60–120s)· Neon(Phase 2)· 环境变量见 `.env.example`。
成本控制:改写用 `generateObject` 单次调用多平台;抓取缓存;长样本截断(单样本 6k 字符);Phase 2 对 style prompt 开 Anthropic prompt caching(风格 prompt 在每次请求中是稳定前缀)。

## 9. 安全

SSRF 防护(§5)· 所有入参 zod 校验与长度上限 · 外部文本隔离(§4)· 不存储用户第三方凭证 · Phase 2:登录 + 每用户速率限制(Upstash)。
