# MediaForge

> 贴一个链接,或说一个话题。AI 用**你的**文风,写给公众号、X、小红书、B 站。复制,发布。
> Paste a link or a topic. AI writes it in *your* voice for WeChat, X, Xiaohongshu and Bilibili. Copy, publish.

## 产品哲学 Philosophy

对标 [Vercel AI Chatbot](https://github.com/vercel/ai-chatbot) / ChatGPT:**对话是主界面,不是附加功能。**

| 原则 | 含义 |
|---|---|
| **AI-native,不是套壳** | 抓取、改写、学风格都是 agent 的 *tool*;UI 只是工具结果的渲染层 |
| **Chat-first** | 默认页就是对话。链接、话题、反馈,都是一句话 |
| **极简** | 一个输入框 + 四个页面。没有设置迷宫 |
| **风格是一等公民** | 风格 = 可学习、可修正、可版本化的 Agent,而非"语气下拉框" |
| **保留素材** | 图片/视频原样随文返回,模型永不碰媒体 |

## 特性 Features

- **改写模式**:链接(X / 小红书 / B 站 / 公众号 / 任意文章)→ 抓取 → 选平台 → 一键复制,图片视频保留
- **创作模式**:话题 + 若干参考链接 → 流式生成长文 → 适配多平台
- **风格 Agent**:给 3–5 篇样本 → 提取语音特征 → 生成风格 Prompt → 用反馈或*你的手改*迭代
- **全站可对话**:对话页内含完整闭环(抓取卡片、平台 Tab、复制按钮都是对话里的组件)

## 技术栈 Stack

| 层 | 选型 |
|---|---|
| 框架 | Next.js 15 App Router · React 19 · TypeScript (strict) |
| UI | Tailwind v4 (CSS-first, OKLCH tokens) · shadcn/ui 约定(`cva` + `cn`) · Motion · lucide |
| AI | Vercel AI SDK v5(`useChat` / `streamText` / `generateObject` / tool-use)· Claude Sonnet 4.5 默认 |
| 编排 | AI SDK v5 tool-use 循环(`stopWhen: stepCountIs`),不引入 LangGraph —— 见 [architecture](docs/architecture.md#编排选型) |
| 抓取 | `@mozilla/readability` + `linkedom`;X 走 fxtwitter API;B 站走 view API |
| 数据 | Neon Postgres + Drizzle(schema 已就绪,MVP 骨架用 localStorage 跑通) |
| 部署 | Vercel |

## 快速开始 Quick start

```bash
pnpm install
cp .env.example .env.local      # 填入 ANTHROPIC_API_KEY
pnpm dev                        # http://localhost:3000
```

**核心 Demo(30 秒)**:打开首页 → 粘贴 `https://x.com/<user>/status/<id>` → Agent 自动抓取并展示来源卡片 → 回复「小红书和公众号」→ 切 Tab → 点「复制」。

单独试抓取器:

```bash
pnpm fetch-link https://x.com/<user>/status/<id>   # → {title, author, text, images[], videos[]}
```

## 目录 Layout

```
app/            页面(/ 对话 · /rewrite · /editor · /styles)与 app/api/* Route Handlers
components/     chat · post-card · platform-picker · nav · ui/button
lib/            ai.ts(prompt+LLM 调用) · fetcher.ts · types.ts · platforms.ts · styles-store.ts · db/schema.ts
scripts/        link-fetcher.ts(CLI)
docs/           architecture · product-spec · style-agent · api · data-model · ui-style-guide
```

## 文档 Docs

[architecture](docs/architecture.md) · [product-spec](docs/product-spec.md) · [style-agent](docs/style-agent.md) · [api](docs/api.md) · [data-model](docs/data-model.md) · [ui-style-guide](docs/ui-style-guide.md)

## 当前状态 Status

骨架阶段。已跑通:四个核心路由 + `/api/chat`、抓取器、对话闭环、风格学习/修正(localStorage 持久化)。
未做(见各文档 Roadmap):登录与 Postgres 持久化、ZIP/HTML 导出、全局 ⌘K 对话抽屉、风格自动评测、小红书登录态抓取。

## 开发分工 Workflow

Claude Code 负责需求、架构、关键环节把控与验收;琐碎实现(样板、注释、测试、重命名)可交给 DeepSeek 等低成本模型。
