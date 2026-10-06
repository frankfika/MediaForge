# MediaForge 技术选型决策表

> AI 原生多平台内容创作 Web 应用 · 选型时间：2025 Q4
> 原则 — 极简、AI native、现代、UX 极致；不列"都行"、要选一个。

---

## 1. AI Chat UI 组件库 — 推荐:assistant-ui + Vercel AI SDK v6 (组合最优)

| 候选                                   | 推荐         | 理由                                                                                                                                                                                                                                                                                                                             | 备选                                                                                                                                                                                                               | 风险                                                                                                                                        | 官方 URL                     |
| -------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Vercel AI SDK v6** (`@ai-sdk/react`) | ✅ 底层必备  | TypeScript-first；20+ 模型 provider；`useChat` 已重写为 transport 架构，UIMessage/ModelMessage 分离；`stopWhen`+`prepareStep` 控制 agent loop；原生 SSE 流式；MCP 客户端原生支持。v6 (2025-12) 增加 `ToolLoopAgent` 抽象、`needsApproval` 人类参与、`Output.object()` 替代 `generateObject`、DevTools UI。                       | —                                                                                                                                                                                                                  | 版本演进快（v4→v5→v6→v7），需要锁定 dist-tag；近期 API 有重命名（`onFinish`→`onEnd`、`stepCountIs`→`isStepCount`），锁定 v6 dist-tag 可控。 | https://sdk.vercel.ai/docs   |
| **assistant-ui**                       | ✅ UI 层首选 | Radix-inspired 可组合组件库；Radix/shadcn 设计语言；自动流式、自动 markdown、自动滚动、键盘 a11y、附件；Generative UI（Tool UI 把工具调用映射成 React 组件）；Human-in-the-loop 内建；用 `useChatRuntime` 直接对接 AI SDK v6；月下载 200k+；被 LangChain/Stack AI 等生产采用；YC 提到的"几小时从 0 到生产聊天界面"不是营销话术。 | shadcn/ui 的 chat patterns（轻量，但需要手写 streaming / 滚动 / 工具渲染所有样板）；CopilotKit（更适合 in-app "副驾驶" sidebar，不是 in-app 主聊天 UI，且 lock-in 偏强）；chat-langchain（参考模板，不是组件库）。 | 核心团队来自主团队，4.x 已稳定；如有断代式 API 改动通常保留 deprecation alias。                                                             | https://www.assistant-ui.com |
| CopilotKit                             | ❌ 不选      | 偏"嵌入式 sidebar/popup"；前端工具通过 `useCopilotAction`/`renderAndWait` 模式与 React state 紧耦合——对 MediaForge 这种"以聊天为产品主界面"的产品过度；用 CoAgents 接 LangGraph 是亮点，但增加了一层协议栈；如要省事可作为 v0.2+ 的"inline 副驾驶"加进来。                                                                       | —                                                                                                                                                                                                                  | Lock-in：前端工具协议（AG-UI）是它自己的；切换成本高。                                                                                      | https://www.copilotkit.ai    |

**示例 - Vercel AI SDK v6 route handler（服务端）:**

```ts
// app/api/chat/route.ts
import { streamText, tool, convertToModelMessages, isStepCount } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: openai("gpt-4o"), // provider 可一行切换
    messages: convertToModelMessages(messages), // UIMessage → ModelMessage
    stopWhen: isStepCount(5), // 控制 agent loop
    tools: {
      generatePost: tool({
        description: "Generate a social media post draft",
        inputSchema: z.object({
          platform: z.enum(["wechat", "x", "zhihu", "xiaohongshu", "bilibili"]),
          topic: z.string(),
          tone: z.enum(["professional", "playful", "warm"]).optional(),
        }),
        execute: async ({ platform, topic, tone }) => {
          // 风格学习 / 模板检索 / 落库 — 全部在 step 内
          return await runPipeline({ platform, topic, tone });
        },
      }),
    },
  });
  return result.toUIMessageStreamResponse();
}
```

**示例 - assistant-ui 客户端（消费 v6 流）:**

```tsx
// app/(chat)/page.tsx
"use client";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk"; // 与 AI SDK v6 集成
import { Thread } from "@/components/assistant-ui/thread";

export default function ChatPage() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

---

## 2. 设计语言 — 推荐:Linear 风"深色极致 + 浅色克制"双主题

| 候选                                    | 推荐     | 理由                                                                                                                                                                                                             | 备选                                                            | 风险                                                                                                   | URL                                           |
| --------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **Linear 风（深色主导）**               | ✅ 主推  | "Linear Design Style"是当下最被引用的 AI native 视觉范式：高对比黑白灰 + 单一品牌色点缀；克制动效（<200ms、快、轻）；键盘优先；侧栏 / 工作台 / 卡片层级清晰；frosted glass 已被 Linear 2025-10 mobile 改版采纳。 | —                                                               | 容易做"看上去像 Linear 但没有 Linear 的产品力"——关键不在视觉模板而在交互节律。                         | https://linear.app/blog/design-for-the-ai-age |
| JetBrains New UI / Apple Intelligence   | 参考     | 极深灰 + 紧凑信息密度 + 半透明材质；适合"专业用户/重操作"语义；MediaForge 的多平台编辑场景下借鉴其密度感。                                                                                                       | Notion 风（白底大留白）太轻，不适合内容创作工具；Arc 风偏类杀。 | JetBrains 风格是 IDE 化的，移植到 Web 要小心别让普通用户排斥。                                         | —                                             |
| Vercel AI Chatbot / ChatGPT / Claude.ai | 参考     | 极简：顶部消息流 + 底部输入框 + 右侧"侧边栏/Artifact/工具结果"。AI native 范式已经收敛。                                                                                                                         | —                                                               | 不能直接抄 ChatGPT——MediaForge 的核心差异是"多平台生成 + 工作流编排"，UI 必须承载任务树与多 artifact。 | https://vercel.com/templates/ai/ai-chatbot    |
| shadcn `shadcn-chat` / Tailark 等模板   | 加速起点 | 已经把"minimal AI chat"做到 90 分水准，作为基础 layout 起点；再覆写品牌色与动效即可。                                                                                                                            | —                                                               | 模板套路雷同，差异化得在生成侧做。                                                                     | https://www.tailark.com/blocks                |

**结论:** 默认主题 — 深色（"#0A0A0B" 底 + 近白前景 + 单一 brand color）。可选浅色 — 白底 + 高对比文字 + 同色 brand。

---

## 3. 核心栈选型

### 3.1 框架 — 推荐:Next.js 15 App Router + React 19 + TypeScript

| 候选                                 | 推荐 | 理由                                                                                                                                                                                                                                                      | 备选                                                          | 风险                                                                                                                                                                      | URL                        |
| ------------------------------------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Next.js 15 App Router + React 19** | ✅   | App Router 成熟稳定；React Server Components + Server Actions 直接配合 AI SDK v6 的 `Output.object` 与 tool calling；ISR/PPR 适合多平台内容页 SEO；Vercel 部署"零配置"；AI SDK 官方 demo、assistant-ui、shadcn/ui 都以 Next.js 为首选示例；社区生态最大。 | —                                                             | 学习曲线：server vs client 边界、缓存、middleware 顺序；CVE-2025-29927 middleware bypass 漏洞要求"不能仅靠 middleware 鉴权"，选型时要避开 NextAuth middleware-only 模式。 | https://nextjs.org         |
| React Router v7 (Remix)              | ❌   | 数据 router 更优雅；web 标准；runtime agnostic。但生态与 AI SDK / assistant-ui / shadcn 模板集成明显落后 Next.js；AI tools（Cursor / Claude Code）对 RR v7 的训练数据显著少。                                                                             | 适合纯 SPA / 非 Vercel 部署 / 团队特别在意 web standards 时。 | 框架尚未稳态。                                                                                                                                                            | https://reactrouter.com    |
| TanStack Start                       | ❌   | Type-safe router 体验极佳，但仍在 beta；RSC 未到位。                                                                                                                                                                                                      | 适合 React Query/TanStack 团队。                              | beta 阶段不适合 v0.1 上生产。                                                                                                                                             | https://tanstack.com/start |

### 3.2 样式 — 推荐:Tailwind CSS v4

| 候选                                 | 推荐 | 理由                                                                                                                                                                                                                                                              | 备选 | 风险                                                                                                                               | URL                     |
| ------------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Tailwind CSS v4**                  | ✅   | 2025-01-22 稳定；Oxide 引擎 + Lightning CSS（Rust）全量构建 5x、增量 100x；CSS-first 配置（`@theme`、`@utility`、`@source`），设计 token 直接作为 CSS variables 暴露，dark/light 主题切换极简；零配置自动扫文件；first-party Vite plugin；shadcn/ui 完整适配 v4。 | —    | Next.js 用户需要 1 个 thin `postcss.config.mjs`（`@tailwindcss/postcss`）；浏览器基线：Safari 16.4+ / Chrome 111+ / Firefox 128+。 | https://tailwindcss.com |
| vanilla-extract / Panda CSS / Stylex | ❌   | zero-runtime CSS-in-TS 价值明确，但生态小、与 shadcn 模板适配差；不适合需要快速照搬现成极简 UI 模板的场景。                                                                                                                                                       | —    | 学习曲线 + 模板稀缺。                                                                                                              | —                       |

### 3.3 UI 组件 — 推荐:shadcn/ui（基底）+ Radix UI primitives + 自研品牌层

| 候选                   | 推荐 | 理由                                                                                                                                                                                                                  | 备选                                               | 风险                                                                                                             | URL                      |
| ---------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **shadcn/ui**          | ✅   | 不是 npm 包，是"复制源码到你 repo 里"的范式；Radix UI primitives（无障碍 + 键盘）+ Tailwind v4 样式；代码所有权；Tailwind native 主题切换；2025 默认 Base UI / Tailwind v4 适配良好；GitHub 83k+ star、~200k 周下载。 | —                                                  | "代码在自己 repo"= 没有"npm upgrade"路径，版本同步要靠 CLI；shadcn 默认 Base UI（v1.7+）对部分复杂组件要先验证。 | https://ui.shadcn.com    |
| Radix UI               | 配合 | shadcn 默认底层就是 Radix Primitives（无样式、无障碍），直接消费即可。                                                                                                                                                | —                                                  | —                                                                                                                | https://www.radix-ui.com |
| Mantine                | ❌   | 120+ 组件，hooks 极多（useForm/useDisclosure），TypeScript DX 好。但 Emotion CSS-in-JS 与 RSC/Tailwind v4 时代略错位；2016 → 2025 设计语言偏"业务感"，与 MediaForge 的"极致 AI 范式"不符。                            | 想全栈现成组件（dashboard / form / table）时再选。 | bundle 略大。                                                                                                    | https://mantine.dev      |
| Chakra UI v3 / Park UI | ❌   | Chakra v3 已支持 RSC、Tailwind v4 适配，文档和模板完整。但 shadcn 仍是 2025 共识默认，AI 工具、模板、招聘面更广。                                                                                                     | 团队偏好 prop-driven API 时选。                    | 学习曲线 + 社区体量小于 shadcn。                                                                                 | https://chakra-ui.com    |

### 3.4 动画 — 推荐:Motion（前 framer-motion）+ 局部用 CSS transitions

| 候选                                                   | 推荐      | 理由                                                                                                                                                                                                                                                                                                                                              | 备选                                                                          | 风险                                                                                                                 | URL                |
| ------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **Motion**（`npm i motion`，从 `motion/react` import） | ✅        | Framer Motion 2025-02 改名 Motion；30M 月下载；混合引擎（Web Animations API + ScrollTimeline → 120fps）；spring physics、layout 动画、`whileInView`、gestures（drag/hover/tap）；CSS 不能处理的部分（spring、可中断 keyframes、跨设备 gestures）Motion 完整覆盖；Tailwind 友好（一个负责静态 utility、一个负责动画值）。`useReducedMotion` 内置。 | —                                                                             | 与 Tailwind 同一属性同时控制会冲突（inline style 胜过 utility），约定 Motion 管 transform/opacity，Tailwind 管其它。 | https://motion.dev |
| GSAP                                                   | ❌ (v0.1) | 2025-04 后所有插件免费（包括 ScrollTrigger、SplitText、MorphSVG）；scroll storytelling 仍是 GSAP 的绝对优势；但 MediaForge 是"应用"非"叙事站点"，用不到 ScrollTrigger 的核心场景（pin、scrub、snapping）。                                                                                                                                        | 等真要做 hero scroll 叙事时再引；需 `import { useGSAP } from '@gsap/react'`。 | bundle 多一个动画库。                                                                                                | https://gsap.com   |
| auto-animate                                           | ❌        | 极简 DOM 进出动画，不够覆盖。                                                                                                                                                                                                                                                                                                                     | —                                                                             | —                                                                                                                    | —                  |

### 3.5 数据库 + ORM — 推荐:Postgres + Drizzle ORM + Neon

| 候选            | 推荐 | 理由                                                                                                                                                                                                                                                                                                              | 备选                                                     | 风险                                                                            | URL                        |
| --------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------- |
| **Postgres**    | ✅   | 51.9% 开发者用，pgvector 内置；JSONB / GIN / GiST / pg_trgm 全开箱；MediaForge 要存"风格 embedding + 多平台草稿"，pgvector 直接用。                                                                                                                                                                               | —                                                        | —                                                                               | https://www.postgresql.org |
| **Drizzle ORM** | ✅   | SQL-first、零依赖；ESM、tree-shakable、小 bundle；cold start 在 serverless/edge 碾压式优于 Prisma（v3 vs v7 ≈ ~50ms vs ~300ms）；schema-as-code（TS）；`drizzle-kit` migration 全套；与 Vercel/Neon/Cloudflare 全兼容。代价：复杂查询需要写 SQL；type-check 在超大 schema 下稍慢（Prisma codegen 在该场景反胜）。 | —                                                        | 学习曲线对"SQL 不熟"的团队略陡；monorepo 大型 schema 推 type-check 速度会下降。 | https://orm.drizzle.team   |
| Prisma          | ❌   | Schema-first DSL、Prisma Studio、迁移工具成熟；但二进制 query engine 在 serverless 启动慢；bundle 大；2025-09 Prisma 团队自承"type-check 比 Drizzle 快"是 codegen 优势，runtime 在 v8 已经追到 ≈87% pg-driver。                                                                                                   | 团队完全不会 SQL、依赖 Studio GUI、必须用 MongoDB 时选。 | edge/Workers 必须用 Accelerate/Proxy。                                          | https://www.prisma.io      |
| Kysely          | ❌   | type-safe query builder，无 entity/migration；要自己配迁移工具。                                                                                                                                                                                                                                                  | 想要"比 Drizzle 还薄"的 query builder 时选。             | 不是完整 ORM；适用面窄。                                                        | https://kysely.dev         |

### 3.6 部署 — 推荐:Vercel（首推）+ Cloudflare Workers（备份）

| 候选                                          | 推荐      | 理由                                                                                                                                                                                                                                                                                 | 备选                                               | 风险                                                                                        | URL                     |
| --------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------- |
| **Vercel**                                    | ✅        | Next.js 制造者自家平台；零配置 SSR / Serverless / RSC / Image / 字体；Edge Functions；预览部署每个 PR；Fluid compute 让长 agent loop 跑到 800s（Pro）；Vercel Workflows (`"use workflow"` / `"use step"`)+ Vercel Queues 已经在 V0.1 之外提供原生长任务；AI SDK 的事实标准部署目标。 | —                                                  | 国内访问速度/合规需要自建；超出 Pro 用量成本上升；vendor lock-in（ISR / OG 图等部分特性）。 | https://vercel.com      |
| Cloudflare Workers (`@opennextjs/cloudflare`) | ❌ (v0.1) | 边缘 + Workers KV/R2/D1/Queues/Durable Objects；全球最快；极友好；适配成本是"node 适配 + 一些 trade-off（ISR、middleware）。MediaForge v0.1 走 Vercel；如要"全球极低延迟 + 国内友好"，再迁移。                                                                                       | 已有 Cloudflare 资源 / 必须全边缘 / 预算紧张时选。 | Node runtime 适配未到 100% 覆盖；Workers 256MB 内存限制。                                   | https://opennext.js.org |
| Fly.io                                        | ❌        | 30+ region、有 standby 容器（无冷启）；自管 Postgres；适合长跑、global edge；MediaForge 主战场是 serverless，不需要"长跑容器"；Vercel Functions + Workflows 已覆盖。                                                                                                                 | 想用 SSR 长跑 + Postgres 同源 + 完全控制容器时。   | 学习曲线 + DX 不如 Vercel。                                                                 | https://fly.io          |

---

## 4. AI 编排 — 推荐:Vercel AI SDK v6 (ToolLoopAgent) 为主，复杂任务挂 LangGraph.js (可选 v0.2)

| 候选                               | 推荐      | 理由                                                                                                                                                                                                                                                                                                                                                                                  | 备选                                                  | 风险                                                                                 | URL                                           |
| ---------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------- |
| **Vercel AI SDK v6 ToolLoopAgent** | ✅ 主用   | TypeScript-first；Multi-provider（OpenAI/Anthropic/Google/Bedrock/Mistral/Groq/xAI 等 20+）；`streamText` + `tool` + `stopWhen: isStepCount(n)` 完整 agent loop；`needsApproval` 内建 human-in-the-loop；MCP 客户端 (`createMCPClient`) 原生；`Output.object()` 替代 `generateObject`；与 Next.js Server Actions / useChat / useChatRuntime (assistant-ui) 零缝集成；"单一完美抽象"。 | —                                                     | "Agent loop" 简单够用，但 durable / 多 agent 协作 / 时间旅行调试能力不及 LangGraph。 | https://sdk.vercel.ai/docs/foundations/agents |
| LangGraph.js                       | ❌ (v0.1) | Python 生态下 LangGraph 是 production 默认（Klarna 85M 用户、Replit Agent 多步应用流）；v1.0 2025-10 稳定；持久化 checkpoints、time-travel 调试、人在环 interrupt 是其核心；90k+ star。MediaForge v0.1 用 v6 + Inngest 已够；待"风格学习 → 多 agent 协作 → 跨会话状态"成真需求时再引入 LangGraph.js 作为可选 sub-agent 引擎。                                                         | 需要 persistent graph + time-travel + 多 agent 时选。 | 团队若是 TS-only，要承受 Python-first 的生态重力；学习曲线陡。                       | https://langchain-ai.github.io/langgraphjs/   |
| CopilotKit AG-UI + LangGraph       | ❌        | 适合"前端 UI 与 LangGraph agent 双向状态同步"的场景；MediaForge 用 assistant-ui 已可渲染自定义 artifact，不需要再叠一层 AG-UI 协议。                                                                                                                                                                                                                                                  | —                                                     | 多一层协议、调试面增大。                                                             | —                                             |

**结论：** v0.1 全栈 Vercel AI SDK v6（ToolLoopAgent + tools + MCP）；v0.2 视情况加 LangGraph.js 做"风格学习 + 长编排"子任务；CopilotKit 不上。

---

## 5. 认证 / 持久化 / 异步任务

### 5.1 认证 — 推荐:Clerk（v0.1 最快可上线） / Auth.js v5（要全开源自托管时）

| 候选                  | 推荐      | 理由                                                                                                                                                                                                                                                                      | 备选                                                             | 风险                                                                                       | URL                         |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------- |
| **Clerk**             | ✅ v0.1   | 预建 React 组件；drop-in `<SignIn/>`/`<SignUp/>` `<UserButton/>`；OAuth 20+ providers；MFA、organizations、Webhooks；2025 更新免费 tier 到 50K MAU；Next.js App Router 一等公民；CVE-2025-29927 后 middleware-only 鉴权被认为不安全，Clerk 在 RSC + Edge 路径已完整验证。 | —                                                                | 10K MAU 后涨价；用户数据托管在 Clerk；如要纯自有数据 v0.2 可切 Auth.js v5 或 Better Auth。 | https://clerk.com           |
| Auth.js v5 (NextAuth) | ❌ (v0.1) | 完全开源、自托管、零成本；Next.js 原生；JWT/database session 灵活；CVE-2025-29927 后必须 split config + edge-safe config + 不得只依赖 middleware；v5 文档与稳定性在变好但仍 beta 久。                                                                                     | 必须开源 + 数据自有 + 团队不愿付 SaaS 时选；B2B、SSO 走 WorkOS。 | CVE-2025-29927 暴露的 middleware 信任模型需重新设计。                                      | https://authjs.dev          |
| WorkOS                | ❌        | B2B SSO / SAML / SCIM 专用；1M MAU 免费 user management（"nobody noticed"），B2B SaaS 实际性价比高。                                                                                                                                                                      | 目标客户是企业 / 要 SSO 时选。                                   | Consumer 体验不够细腻。                                                                    | https://workos.com          |
| Better Auth           | ❌ (v0.1) | TypeScript-first、插件系统（MFA / orgs / passkeys）、数据自有；2025 YC $5M；快速成长。                                                                                                                                                                                    | 想完全自有数据 + Clerk DX 但不要 Clerk 锁定时选。                | 项目较新、生产 case 少于 Clerk/Auth.js。                                                   | https://www.better-auth.com |

**结论：** v0.1 上 Clerk；v1.0 后给"切自有"留出路径（Auth.js v5 / Better Auth）。

### 5.2 Postgres 托管 — 推荐:Neon

| 候选        | 推荐      | 理由                                                                                                                                                                                                   | 备选                                                                                       | 风险                                                                                                 | URL                     |
| ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------- |
| **Neon**    | ✅        | Compute/storage 分离；scale-to-zero（0.5 GiB free、10 branches free）；冷启 ~500ms（可禁用 auto-suspend）；HTTP driver 直连 edge；branching 是 preview 环境杀手锏；与 Vercel/Drizzle/AI SDK 完美契合。 | —                                                                                          | 2025-05 Databricks 收购传闻——产品路线要继续关注；今天仍是独立产品。                                  | https://neon.tech       |
| Supabase    | ❌ (v0.1) | BaaS 一站式：DB + Auth + Storage + Realtime + Edge Functions；500MB free + 50K MAU auth；Postgres + RLS + pgvector + Realtime + Storage 整合体验最佳。                                                 | 想"一站式后端"不想要自接 Auth/Drizzle 时选；v0.2 上 ChatMediaGallery / Realtime 协作时换。 | ❗ MediaForge v0.1 用 Neon + Clerk 已有等价 Auth/Storage；Supabase 的 auth 与 Clerk 重叠成本不划算。 | https://supabase.com    |
| PlanetScale | ❌        | MySQL only（2025-09 才进 Postgres）；no scale-to-zero；贵。MediaForge 要 Postgres + scale-to-zero + pgvector。                                                                                         | —                                                                                          | —                                                                                                    | https://planetscale.com |

### 5.3 异步任务 — 推荐:Inngest（默认） + Vercel Workflows（v0.2+ 可迁移）

| 候选                               | 推荐                    | 理由                                                                                                                                                                                                                                                                                                                  | 备选                                                                                    | 风险                                                                                      | URL                              |
| ---------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------- |
| **Inngest**                        | ✅ v0.1                 | Event-driven durable execution；`step.run`/`step.waitForEvent`/`step.sleep`/`step.sleepUntil` 原语；`step.ai.infer()` LLM observability 不需要 Helicone/LangSmith；multi-tenant `concurrency-key` 模型贴合 SaaS；Hobby 50K 用量/month；Serverless cold-start <100ms（stateless workers）。已集成 Vercel Marketplace。 | —                                                                                       | "Sleeps 无连接开销"但 > trace window 的 sleeps 在 dashboard 上不显著可见，要按 runId 查。 | https://www.inngest.com          |
| Trigger.dev v3                     | ❌ (v0.1)               | Apache 2.0、自托管、no-timeout、long-running 1 年上限；type-safe tasks；managed 平台价格 $0.0025/CU-minute；自托管全免；非常适合 video / batch / 数据导出。                                                                                                                                                           | 任务 > 60 min、需要自托管、必须不超 1 年 runtime 时选。                                 | 单 vs 视频驱动模型（vs Inngest 的 event-driven），按任务形状选。                          | https://trigger.dev              |
| Vercel Workflows (`workflow/next`) | ❌ (v0.1), ✅ v0.2 候选 | `'"use workflow"' / '"use step"'` 标记；managed persistence；与 Next.js + Vercel 一等公民；Vercel AI SDK v6 推荐组合之一；适合"durable steps that pause/resume on Vercel"。                                                                                                                                           | v0.2 切到 Vercel 时优先迁移；目前仍 public beta；beta 期有 webhook token 安全问题需审。 | beta。                                                                                    | https://vercel.com/docs/workflow |
| Temporal                           | ❌                      | production strongest（$349.5M 融资、Netflix/Uber scale）；需自建 platform engineering team。                                                                                                                                                                                                                          | 5 个 9 可靠性 / mission-critical workflow 时选。                                        | 学习曲线 + 运维成本。                                                                     | https://temporal.io              |

**结论：** v0.1 默认 Inngest（事件驱动 + LLM step 内置）；v0.2 看 Workflows 是否 GA 决定是否迁移。

---

## 6. 如果不追求完美 — MediaForge v0.1 最小可跑栈（直接照搬）

### package.json

```json
{
  "name": "mediaforge",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "next": "^15.5.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",

    "ai": "6.0.264",
    "@ai-sdk/react": "3.0.267",
    "@ai-sdk/openai": "3.0.99",
    "@ai-sdk/anthropic": "3.0.99",
    "@ai-sdk/google": "3.0.99",
    "@ai-sdk/mcp": "1.0.72",

    "@assistant-ui/react": "^0.10.0",
    "@assistant-ui/react-ai-sdk": "^1.3.40",

    "@clerk/nextjs": "^6.0.0",

    "drizzle-orm": "^0.36.0",
    "@neondatabase/serverless": "^0.10.0",

    "@upstash/ratelimit": "^2.0.0",
    "@upstash/redis": "^1.34.0",

    "inngest": "^3.30.0",

    "motion": "^12.0.0",

    "zod": "^3.24.0",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.0",
    "sonner": "^1.7.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",

    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",

    "drizzle-kit": "^0.30.0",

    "postcss": "^8.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.5.0",
    "prettier": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.6.0"
  }
}
```

### next.config.ts

```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  experimental: { typedRoutes: true },
  output: "standalone",
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
export default nextConfig;
```

### postcss.config.mjs

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

### app/globals.css

```css
@import "tailwindcss";

@theme {
  /* Brand */
  --color-brand-50: oklch(0.97 0.02 264);
  --color-brand-500: oklch(0.62 0.19 264);
  --color-brand-900: oklch(0.25 0.1 264);

  /* Surface — Linear-style dark-first */
  --color-bg: oklch(0.18 0.005 264);
  --color-surface: oklch(0.22 0.005 264);
  --color-fg: oklch(0.96 0.005 264);
  --color-muted: oklch(0.65 0.005 264);
  --color-border: oklch(0.3 0.005 264);

  /* Type */
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, monospace;
}

@media (prefers-color-scheme: light) {
  :root {
    --color-bg: oklch(0.99 0.005 264);
    --color-surface: oklch(0.97 0.005 264);
    --color-fg: oklch(0.18 0.005 264);
    --color-muted: oklch(0.4 0.005 264);
    --color-border: oklch(0.9 0.005 264);
  }
}
```

### drizzle.config.ts

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

### app/api/chat/route.ts（AI SDK v6 最小可用）

```ts
import { streamText, convertToModelMessages, isStepCount, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    system: "You are MediaForge, a multi-platform content co-pilot.",
    tools: {
      draftPost: tool({
        description: "Draft a post for a target platform.",
        inputSchema: z.object({
          platform: z.enum(["wechat", "x", "zhihu", "xiaohongshu", "bilibili", "reddit", "hn"]),
          topic: z.string(),
          tone: z.enum(["professional", "playful", "warm"]).optional(),
        }),
        execute: async ({ platform, topic, tone }) => {
          // TODO: pipeline (RAG → style memory → template)
          return { platform, topic, draft: `(${platform} placeholder draft for "${topic}")` };
        },
      }),
    },
  });
  return result.toUIMessageStreamResponse();
}
```

### app/(chat)/page.tsx（assistant-ui 客户端）

```tsx
"use client";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

export default function ChatPage() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

### app/layout.tsx

```tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = { title: "MediaForge", description: "AI-native multi-platform content co-pilot" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="bg-bg text-fg font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### .env.local（不要 commit）

```
# LLM
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
# DB (Neon)
DATABASE_URL=postgresql://...neon.../neondb?sslmode=require
# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
# Background (Inngest)
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
# Rate limit (Upstash, optional v0.1)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## 7. 一次性决策清单（v0.1 必须 12 条）

1. 框架 = **Next.js 15 App Router + React 19 + TS strict** ✅
2. 样式 = **Tailwind CSS v4**（CSS-first 配置，oklch token）✅
3. UI 基础 = **shadcn/ui 复制源码 + Radix Primitives + 自研品牌层** ✅
4. 动画 = **Motion**（CSS 管静态 / Motion 管值）✅
5. ORM = **Drizzle**；DB = **Postgres (Neon)** ✅
6. AI 编排 = **Vercel AI SDK v6**（`streamText` + `tool` + `Output.object`）✅
7. AI Chat UI = **assistant-ui + `@assistant-ui/react-ai-sdk` runtime** ✅
8. 设计语言 = **Linear 风（深色主导 + 单色 brand + 克制动效）** ✅
9. 认证 = **Clerk**（10K MAU 免费 → 50K MAU 免费，超出再切）✅
10. 异步任务 = **Inngest**（event-driven + LLM step；长任务 sleep 免费）✅
11. 部署 = **Vercel**（零配置 + Workflows/Queues 备好；Fluid compute 给 agent 长 loop）✅
12. 限流/缓存 = **Upstash Redis + @upstash/ratelimit**（v0.1 可选）✅

---

## 8. 风险与不选项的诚实理由

- **Mantine 不选：** CSS-in-JS（Emotion）与 RSC/Tailwind v4 时代脱节；视觉偏业务风，不符合"AI native 极致"语义。
- **Prisma 不选：** 二进制 query engine 在 serverless cold start 多耗 ~250ms；bundle 大；MediaForge 用 Drizzle 拿全部这俩优惠 + SQL 透明。
- **CopilotKit 不选：** 偏"in-app sidebar/popup 副驾驶"语义，与"以聊天为主界面"的产品主轴重叠且互斥。
- **React Router v7 / TanStack Start 不选：** AI SDK / assistant-ui / shadcn 官方示例与社区模板以 Next.js 为事实标准；AI 工具对 v7/start 训练数据明显少。
- **Supabase 不选（v0.1）：** 已用 Clerk 解决 Auth；Supabase Auth + Clerk 重叠成本不划算；v0.2 要 Realtime 协作/存储再迁。
- **GSAP 不选：** scroll storytelling 不是 MediaForge 的核心交互；动画需求 Motion 已 100% 覆盖。
- **Vercel Workflows 不选（v0.1）：** 仍 public beta；Inngest 已经覆盖 event-driven + sleep + LLM step；v0.2 看 Workflows GA 决定是否迁移。
- **Better Auth 不选（v0.1）：** 项目较新、生产案例少于 Clerk；要"完全自有数据 + Clerk DX"时 v0.2 再评估。

---

## 9. 升级路径（v0.2 → v1.0）

- AI SDK：v6 dist-tag 锁住，跟随 v7 升级 codemod。
- ORM：保持 Drizzle；监控 Prisma 8 性能追赶情况，必要时再 review。
- 异步：Inngest → Vercel Workflows（如 v0.2 已 GA）+ Vercel Queues 双轨（短 worker 在 Inngest、长 worker 在 Workflows）。
- 认证：Clerk → Auth.js v5 / Better Auth（如 SaaS 增长到想完全控制用户数据）。
- DB：Neon 继续；监控 Databricks 收购后路线。
- UI：保持 assistant-ui + Radix + shadcn 自研品牌层；视情况引入更多 shadcn Blocks 派生组件。
- 部署：Vercel 继续；如要"国内低延迟 / 全球 edge 强一致"，追加 `@opennextjs/cloudflare` 适配器。
