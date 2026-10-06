# MediaForge 开源项目调研报告

> 调研目的：摸清 4 个方向的开源版图（AI Chatbot 产品哲学参考 / 多平台发布工具 / 链接抓取 / 风格学习-Prompt 优化），找出可以直接 fork、拆模块复用或被商业产品替代的对象。
>
> 调研方式：web_search 实际抓取（中英文 + GitHub README + 第三方分析），数据为 2025-12 至 2026 上半年快照。
>
> 声明：本报告**只列事实**（项目名、链接、star、维护状态、许可证），**不做好坏评价**；已剔除不能确认存在的项目。

---

## 方向 1 · AI Chatbot 类（产品哲学 / 对话 UI / 流式 / 持久化）

### 1.1 vercel/chatbot（原 vercel/ai-chatbot）

- **链接**：https://github.com/vercel/chatbot
- **Star**：~20.9k（README 数字）
- **核心特性**：
  - Next.js 16 App Router + React Server Components + Server Actions
  - Vercel AI SDK 统一接入 OpenAI / Anthropic / Google / xAI / Mistral / Moonshot / DeepSeek（走 AI Gateway）
  - shadcn/ui + Tailwind + Radix UI
  - Neon Serverless Postgres 存会话，Vercel Blob 存文件
  - Auth.js（NextAuth）认证
- **维护**：活跃，最近提交约 74 天内（hysenlabs 镜像数据）
- **许可证**：仓库标注 NOASSERTION（README 有"View license"链接，实际情况接近 MIT-style 但非 SPDX 标准标记，**商业使用前必须自己读 LICENSE**）
- **形态**：完整 Next.js 应用模板（不是组件库）

### 1.2 mckaywrigley/chatbot-ui

- **链接**：https://github.com/mckaywrigley/chatbot-ui
- **Star**：~26.5k（README 历史数据），引用值 ~33.2k（部分二手汇总）
- **核心特性**：
  - 早期最经典的 ChatGPT 克隆（先于 vercel/chatbot 出现）
  - Next.js + TypeScript + Tailwind
  - Supabase 做持久化（Postgres + Auth + Storage）
  - Ollama 支持（本地模型）
  - 多模型：OpenAI / Azure OpenAI / 自定义 OpenAI 兼容端点
  - Chrome 浏览器扩展已废，2.0 主推闭源 SaaS "Takeoff Chat"
- **维护**：基本停滞；mckaywrigley 本人把精力放到了闭源 2.0（Takeoff Chat），公开仓库分支仍可跑
- **许可证**：MIT
- **形态**：完整聊天应用

### 1.3 danny-avila/LibreChat（已改名 LibreChat-AI/LibreChat）

- **链接**：https://github.com/danny-avila/LibreChat  （新组织 https://github.com/LibreChat-AI/LibreChat）
- **Star**：~45k–45.3k
- **核心特性**：
  - ChatGPT 增强克隆，**支持 40+ AI provider**：OpenAI / Anthropic / AWS Bedrock / Azure / Google Gemini / Vertex / DeepSeek / Mistral / Groq / OpenRouter / Ollama / Apple MLX / AMD Lemonade 等
  - **MCP（Model Context Protocol）工具集成**、Agent / 子代理委派 / Skills 系统 / Agent 市场
  - **沙箱代码解释器**：Python / Node.js / Go / C/C++ / Java / PHP / Rust / Fortran
  - **生成式 UI**：聊天内直接生成 React、HTML、Mermaid
  - **图像生成与编辑**：DALL-E 3/2、GPT-Image-1、Stable Diffusion、Flux
  - 多用户认证：OAuth2、LDAP、SAML、Email、2FA、Redis 横向扩展
  - S3 + CloudFront 媒体稳定链接
  - 2026 已加入 ClickHouse（被 ClickHouse 收购做 Agentic Data Stack）
- **维护**：极活跃，v0.8.8-rc4，417 contributors
- **许可证**：MIT
- **形态**：完整自托管平台（不是组件库）

### 1.4 langchain-ai/chat-langchain

- **链接**：https://github.com/langchain-ai/chat-langchain
- **Star**：未公开（官方 demo repo，规模小）
- **核心特性**：
  - **Managed Deep Agent** 文档助手，专门回答 LangChain/LangGraph/LangSmith 相关问题
  - Next.js 前端 + Python 后端
  - Pylon 知识库 + 文档 MCP 检索
  - Guardrails middleware 防止跑题
  - 演示 LangChain 自家 agent 架构的参考实现
- **维护**：活跃（LangChain 官方在维护）
- **许可证**：MIT
- **形态**：参考 demo，非通用模板

### 1.5 Shubhamsaboo/awesome-llm-apps

- **链接**：https://github.com/Shubhamsaboo/awesome-llm-apps
- **Star**：高（官方 awesome 列表的活跃度很高，README 列了几十个项目）
- **核心特性**：
  - 收藏式清单，按"AI Agent / RAG / Chat with X / Memory / MCP / Fine-tuning"分类
  - 每个项目一个目录 + README，能直接跑
  - 涵盖：AI 旅行 Agent、AI 投资人、AI 医疗影像、AI 记者、AI Podcast Generator、AI Browser MCP Agent、Deep Research Agent 等
- **维护**：极活跃（持续加入新 demo）
- **许可证**：MIT
- **形态**：**项目集合**，不是单一应用；**适合学模式**而不是直接复用

### 1.6 shadcn-ui/chatbot-template

- **链接**：https://github.com/shadcn-ui/chatbot-template
- **Star**：~947（较新，2025 年发布）
- **核心特性**：
  - **shadcn 官方出的最小聊天模板**
  - Next.js + AI SDK + shadcn/ui chat 组件
  - 流式聊天、tool calling（web search / GitHub 仓库查询）、`ask_user` 人在回路问卷
  - 端到端 TypeScript 类型安全（重命名 tool 字段会构建报错）
  - Vercel AI Gateway 一键鉴权
  - 自定义工具：在文件中 export definition，UI 在 index 注册
- **维护**：活跃（shadcn 团队持续迭代，2025-08 还在更新）
- **许可证**：MIT
- **形态**：模板（参考价值高于直接 fork）

### 1.7 assistant-ui（顺手提及，但常被拿来对比）

- **链接**：https://github.com/assistant-ui/assistant-ui
- **Star**：~9.9k（来源：adminlte 2026 模板对比文章）
- **关键差异**：YC 投资，支持 React + AI SDK + LangGraph + Mastra 多 adapter
- **形态**：chat UI 组件库（不是完整应用）

### 1.8 huggingface/chat-ui

- **链接**：https://github.com/huggingface/chat-ui
- **Star**：~7.7k
- **核心特性**：HuggingFace 自家聊天 UI，支持 HuggingFace Inference Endpoints / OpenAI / Anthropic / 自定义 endpoint，模型/Agent/MCP 集成
- **维护**：活跃
- **许可证**：MIT

---

## 方向 2 · 多平台发布 / 内容创作工具

### 2.1 crawlab-team/artipub（及其现代分支）

- **链接**：https://github.com/crawlab-team/artipub
- **Star**：~3.2k
- **核心特性**：
  - "一文多发"开源老牌工具，**针对中文技术博客圈**（掘金 / SegmentFault / CSDN / 简书 / 知乎 / 开源中国 / 今日头条 / 博客园 / 微博 / 百度百家号 / 51CTO / 开发者头条 / 微信公众号）
  - React 前端 + Node.js 后端 + MongoDB
  - 基于 Puppeteer 的 spider 系统（每个平台一个 spider），Chrome 扩展采集登录 cookie
  - **本地数据库存账户凭证**（不上传到云，规避 OpenWrite 那种账号泄露风险）
- **维护**：原始 crawlab-team/artipub 仓库近 2 年基本停滞；新版 fork "hansonjan/artipub" 重构成 monorepo（core + cli），2025-12 还在发 v1.1.10
- **许可证**：MIT
- **形态**：完整自托管平台
- **现代替代 fork**：
  - https://github.com/hansonjan/artipub（重写为 monorepo，TypeScript，BSD-3-Clause，2025 仍在更新）
  - https://github.com/mbaneshi/contentforge（Rust 重写，CLI/TUI/Web/MCP 多端，单二进制，但目前只支持 DEV.to / Mastodon / Bluesky 等海外平台，**没有微信公众号**）

### 2.2 Strapi（headless CMS）

- **链接**：https://github.com/strapi/strapi
- **Star**：~71k–73k
- **核心特性**：
  - **开源 headless CMS 之王**，Node.js + TypeScript
  - 自动生成 REST + GraphQL API（无需手写 CRUD）
  - 可视化 Content-Type Builder，拖拽定义字段/关系
  - 多数据库：PostgreSQL / MySQL / MariaDB / SQLite
  - 内置 RBAC、Media Library、i18n、draft & publish
  - 插件市场（400+）
  - Strapi AI（2025–2026 GA）：自然语言生成 Content Type、AI 翻译
- **维护**：极活跃，v5.x，50M+ 下载
- **许可证**：核心代码 MIT（README/官方页面写 MIT；但 GitHub License 标签显示 "Other"，**商业使用前建议读 LICENSE 文件确认**）
- **形态**：完整自托管 CMS（不是发布工具，但可以作为内容底层）

### 2.3 Wechaty（微信个人号/公众号 SDK）

- **链接**：https://github.com/wechaty/wechaty
- **Star**：~20k+
- **核心特性**：
  - 微信聊天机器人 / RPA SDK
  - "6 行 JS 写一个微信机器人"
  - 支持 JS / Python / Go / Java 多语言 SDK
  - 多平台：Linux / Windows / macOS / Docker
  - Puppet 协议抽象层（Web / iPad / Windows / macOS / OpenAPI 等多种协议）
  - 商业化路径（提供付费 puppet token）
- **维护**：活跃
- **许可证**：Apache-2.0
- **形态**：SDK（不直接做多平台发布，但是微信生态的事实标准）

### 2.4 wechat-mp-publisher（公众号草稿发布）

- **链接**：https://www.npmjs.com/package/wechat-mp-publisher  （GitHub: best/openclaw-skills/tree/main/wechat-mp-publisher）
- **版本**：v2.0.2（ISC）
- **核心特性**：
  - 本地校验微信 HTML + 通过官方 API 创建可审核的草稿
  - CLI **绝不读取微信凭证**，发布最终由人确认
  - 自动上传图片到微信 CDN，处理内联样式
  - 沙箱预览只监听 127.0.0.1
- **形态**：公众号草稿自动化工具

### 2.5 其他参考

- **yuff100/wechat-to-markdown**（公众号 → Markdown）— MIT，仅支持公开文章，无反检测
- **wanderer-yk/wx2md**（CLI 公众号 → Markdown + 图片本地化）— MIT
- **jackwener/wechat-article-to-markdown**（含 Camoufox 反检测、可作为 AI agent skill 调用）— MIT，2026 还在迭代
- **wechat-article.ts / 2217173240**（Node 22 单文件零依赖公众号 → md/txt/json）— 公开
- 这些大多解决了"采集/导出公众号"，但**没有人解决"AI 改写 + 多平台发布 + 一键"完整闭环**——这是 MediaForge 的机会窗。

---

## 方向 3 · 链接抓取 / 网页解析

### 3.1 mendableai/firecrawl（已迁组织到 firecrawl/firecrawl）

- **链接**：https://github.com/mendableai/firecrawl  （2026 起主仓库迁移到 https://github.com/firecrawl/firecrawl）
- **Star**：~15k（最早 README）→ ~150k+（jacar.es / pondero 2026 评估）→ AIBARS 统计 **187,201**（2026-10）
- **核心特性**：
  - URL → clean Markdown / HTML / 截图 / 结构化 JSON
  - 5 大端点：`/scrape`（单页）、`/crawl`（整站）、`/map`（URL 发现）、`/search`（带全文的搜索）、`/extract`（结构化提取）
  - 代理轮换、JS 渲染、自动绕过反爬
  - **官方 MCP server**（mcp.jina.ai 同类），可直接喂给 Claude Code / Cursor / Continue
  - 官方 SDK：Python（firecrawl-py）、Node（firecrawl），Go / Rust / Java / Elixir 也有
  - Actions：click、scroll、write、wait、press（处理需要交互的 SPA）
  - 媒体解析：PDF、DOCX、图片
- **维护**：极活跃，v2.11.0（2026-06），8 位数 ARR
- **许可证**：
  - **核心 AGPL-3.0**（⚠️ 网络使用触发 source-sharing 义务，**商业闭源产品需要谨慎评估**）
  - SDK 与部分 UI 组件 MIT
- **形态**：托管 API（firecrawl.dev）+ 可自托管（docker compose up）
- **MediaForge 评估**：商业产品若想内嵌 firecrawl 服务而不开源自己代码 → 不能直接用 AGPL 版；可用 SDK（MIT），或自托管只对外暴露为内部微服务

### 3.2 jina-ai/reader

- **链接**：https://github.com/jina-ai/reader
- **Star**：~12k–12.1k（faun / agentspace 数据），20k+ 也出现在 tokrepo 二手汇总
- **核心特性**：
  - **零代码 URL → Markdown**：在 URL 前加 `https://r.jina.ai/` 即返回干净 Markdown
  - **搜索端点** `https://s.jina.ai/<query>` 把搜索结果 Top 5 直接转 Markdown
  - JS 渲染：headless Chrome 或 curl-impersonate 轻量 fetch
  - 解析 PDF / Word / Excel / PPT（LibreOffice）
  - 图片自动 caption（vision-language model）
  - 官方 MCP server：`https://mcp.jina.ai`
  - 输出格式由 header 控制：`x-respond-with: markdown | html | text | screenshot | pageshot | frontmatter`
  - 流量计费，免费层 1000 万 token
- **维护**：活跃（Jina AI 已于 2025-10 被 Elastic 收购，roadmap 在新东家手里）
- **许可证**：Apache-2.0（**比 firecrawl 的 AGPL 友好得多**）
- **形态**：托管 API（r.jina.ai / s.jina.ai / mcp.jina.ai）+ 可自托管（Docker）
- **MediaForge 评估**：**最友好**的链接解析选择。MIT 兼容、免费额度大、可直接当微服务接

### 3.3 Unstructured-IO/unstructured

- **链接**：https://github.com/Unstructured-IO/unstructured
- **Star**：~15.3k–15.5k
- **核心特性**：
  - **60+ 文档格式**解析：PDF / DOCX / PPTX / HTML / images / emails / XLSX 等
  - 智能 partitioning：标题、正文、表格、列表、分页
  - 内置 Layout ML：表格边界识别、标题检测、OCR
  - 40+ 数据源 connector（S3 / GCS / Notion / Slack / Discord 等）
  - 输出：JSON / Markdown / HTML / Arrow
  - 直接对接 Pinecone / Weaviate / Chroma 等向量库
  - **Transform MCP server**（2025 新增）—— 让 Claude Code / Cursor 直接调用
  - VLM partitioning（2025 GA）：视觉语言模型辅助解析复杂排版
- **维护**：极活跃，0.25.x，最近 2 天有发布，PyPI 月下载 3.49M
- **许可证**：Apache-2.0
- **形态**：Python 库 + Docker 镜像 + 商业云 API（unstructured.io）
- **MediaForge 评估**：要"喂 PDF / Word / 邮件附件给 AI"是事实标准；**Apache-2.0 商用无障碍**

### 3.4 公众号 / 小红书 / B 站专用抓取

**没有现成的开源产品把这三家打包**，现成方案是各自搭：

- **公众号抓 Markdown**（见 2.5）：jackwener/wechat-article-to-markdown、yuff100、wanderer-yk/wx2md、bzd6661/wechat-article-for-ai（Camoufox + MCP）
- **小红书**：无成熟开源方案。常见做法是 Playwright + 浏览器指纹对抗（自维护）
- **B 站**：bilibili-API 民间库多（如 bilibili-API-collect、social-media-dl），但稳定性随官方接口变化
- **Twitter/X**：agent-twitter-client、twikit、tweetkit 等；非官方 API 经常被封

> **结论**：**没有"一键抓 X 推 + 公众号 + 小红书 + B 站"的现成开源项目**，MediaForge 必须自己用 Playwright/Camoufox 写或买 firecrawl 的 extract 能力。

### 3.5 通用抓取框架（参考价值）

- **scrapy/scrapy**（Python 爬虫框架）— BSD，~65k+ stars，事实标准
- **microsoft/playwright**（Node/Python 浏览器自动化）— Apache-2.0
- **crawl4ai**（本地 LLM 友好爬虫）— Apache-2.0，~84.6k stars
- **ScrapeGraphAI**（LLM + graph 抽取）— ~31.4k stars
- **scrapling**（自适应 parser，page 改动会重新定位）— Apache-2.0，~84.7k stars

---

## 方向 4 · 风格学习 / Prompt 优化

### 4.1 Anthropic 官方资源（"prompt-tools"在 Anthropic 侧没有独立 GitHub 仓库，但有 cookbook + 官方 library）

- **链接**：https://github.com/anthropics/prompt-eng-interactive-tutorial  +  https://docs.anthropic.com/en/resources/prompt-library/library
- **核心特性**：
  - Anthropic 官方 prompt 工程交互式教程（IPython notebook）
  - 6 大核心原则：Direct & Clear、Context、Examples、XML Structure、Chain of Thought、Tool Use
  - 官方 prompt library 几十个 Claude 优化模板
- **许可证**：未见明确许可证声明（**商业使用前确认**）
- **形态**：教程 + 模板

### 4.2 langchain-ai/langgraph

- **链接**：https://github.com/langchain-ai/langgraph
- **Star**：~8k
- **核心特性**：
  - **图结构编排框架**：节点 = LLM 调用/工具，边 = 路由
  - 状态管理（stateful）+ 持久化（checkpointer）+ 人在回路（interrupt）
  - Streaming / Time-travel / Subgraphs
  - v1.0 已 GA（2025-10-22）
- **维护**：极活跃
- **许可证**：MIT
- **形态**：Python 框架
- **MediaForge 评估**：做"多步写作 pipeline（研究 → 草稿 → 风格校准 → 平台适配）"的核心编排工具

### 4.3 langchain-ai/langchain 主仓

- **链接**：https://github.com/langchain-ai/langchain
- **Star**：未列具体（属于绝对头部项目）
- **核心特性**：完整 LLM 应用框架，含 model I/O、retrieval、agents、memory、evaluation
- **许可证**：MIT
- **MediaForge 评估**：和 LangGraph 配合使用，可直接接管 prompt 模板 + few-shot 示例管理

### 4.4 langgptai/awesome-claude-prompts

- **链接**：https://github.com/langgptai/awesome-claude-prompts
- **Star**：~5.3k
- **核心特性**：5000+ Claude 提示模板，覆盖开发、营销、辅导、创意写作；包含官方 Anthropic 示例 + Claude Code 子集
- **维护**：活跃
- **许可证**：MIT
- **形态**：提示模板集合（直接 copy-paste）

### 4.5 ConsciousML/claude-prompt-catalog

- **链接**：https://github.com/ConsciousML/claude-prompt-catalog
- **Star**：未公开
- **核心特性**：
  - 提示生成器（按 Anthropic / OpenAI / Gemini 最佳实践生成）
  - 现成 prompts：代码审查、Mermaid 图、README 写作等
  - 区分 Assistants（聊天用）和 Agents（Claude Code sub-agent 用）
- **许可证**：Apache-2.0

### 4.6 Fabric（Daniel Miessler）

- **链接**：https://github.com/danielmiessler/fabric
- **Star**：~30k
- **核心特性**：
  - **Unix-pipe 可组合的 AI prompts**（patterns 概念）
  - 像 `cat article.md | fabric --pattern extract_wisdom` 这样用
  - 单职责 pattern：extract_wisdom、create_summary、analyze_claims 等
  - 跨模型（OpenAI / Claude / Ollama）
- **维护**：极活跃
- **许可证**：MIT
- **MediaForge 评估**：**风格学习/提取可借鉴的现成 pattern**，结构最像"风格信号提取器"的就是 `extract_wisdom`

### 4.7 promptfoo/promptfoo

- **链接**：https://github.com/promptfoo/promptfoo
- **Star**：高（评估/prompt 测试领域头部）
- **核心特性**：
  - Prompt 评估 + 回归测试
  - 红队扫描（prompt injection 检测）
  - 命令行 + CI 集成
  - 模型对比 A/B
- **许可证**：MIT
- **MediaForge 评估**：**风格一致性自动评估**的最佳工具

### 4.8 风格学习"做法"现状（不是单一项目，是工程方法）

通过搜到的 few-shot + 风格复刻工程实践（多家公众号 / blog 反复出现的范式），可总结成下面这套"现成做法"：

1. **采集样本**：10–30 篇作者本人作品（plain text）
2. **清洗**：去 HTML / Markdown / 链接 / CTA
3. **LLM 抽取风格信号**：句长、段长、tone、人称、修辞、词汇偏好、开头/结尾模板
4. **约束化**：把抽象描述（"自然、有节奏"）转成可执行规则（"段落不超过 3 句，禁用 X 词"）
5. **组装 system prompt**：角色 + 风格规则 + 结构规则 + 反例（avoid 列表）+ 可选 few-shot 示例（200–400 字）
6. **few-shot + chain-of-thought + 温度 0.4–0.6 + top-p 0.8**

代表性文档（可直接拿来当内部 prompt engineering 手册）：
- https://gist.github.com/s1moe2/1f58d2b9449bfe8e29991e6f4f7bdfe2  （Prompt-Based Style Replication）
- Anthropic 官方 Prompt Engineering Overview
- Field Guide to AI / C# Corner / ScaleWithAI 等 few-shot 系列文章

---

## 结论

### A. 最适合作为 MediaForge 产品参考的 2–3 个项目

1. **LibreChat（danny-avila/LibreChat）** ★45k · MIT
   - 理由：自托管、多 provider、多用户、MCP、Agent、代码解释器、Artifacts —— 是当前**最完整的多能力 AI 应用骨架**。MediaForge 需要把"AI 创作工作台"做出产品感，LibreChat 的对话/工具/MCP 抽象层是最值得拆模块复用的现成模板。
2. **vercel/chatbot + shadcn-ui/chatbot-template** ★20.9k + ★947
   - 理由：shadcn 官方出的 chat UI 模板是**最小可用骨架**，把它和 vercel/chatbot 的多模型 / 持久化拼起来，能用 1–2 天搭出 MediaForge 的对话前端。
3. **Strapi（strapi/strapi）** ★73k
   - 理由：**多平台发布管理后台**的现成底座。MediaForge 需要存文章、存发布队列、存平台账号，Strapi 都能直接接。如果不想自己写后台，**直接 fork Strapi + 加发布 worker** 是最快路径。

### B. 链接抓取最值得借鉴的 1–2 个项目

1. **jina-ai/reader** ★12k · Apache-2.0
   - **首选**。零代码 URL→Markdown、免费额度大、`r.jina.ai/` 前缀可以直接当工具用，**Apache-2.0 商用无障碍**。可作为 MediaForge 的"链接解析微服务"。
2. **firecrawl** ★15k–187k · 核心 AGPL-3.0 / SDK MIT
   - 兜底。功能最全（整站爬、提取、搜索、Actions），但 AGPL 不友好；**只在需要 firecrawl 独有的 extract/search 能力时调用其 REST API（HTTP 调用不传染 AGPL）**。SDK 走 MIT，但 server 端内嵌不可商用闭源。

### C. 是否存在已经做得非常接近 MediaForge 的产品（避免重复造轮子）？

- **artipub（crawlab-team/artipub）**：2019 年的老牌"一文多发"，功能最接近，但：
  - 平台列表几乎全是**中文技术博客圈**（掘金/CSDN/知乎等），**不含 X、小红书、B 站、Reddit、HN、Product Hunt**
  - **没有 AI 改写 / 风格学习**这一步
  - 维护基本停滞（2019 年最后大改）
  - 现代 fork（hansonjan/artipub）变成 monorepo SDK，但仍是"模板填充"思路
- **mbaneshi/contentforge**（Rust 重写）：CLI + TUI + Web + MCP，单二进制，但**目前只支持 DEV.to / Mastodon / Bluesky 等海外平台**，**没有微信公众号 / 小红书 / B 站**
- **商业 SaaS**（OpenWrite / 易媒助手 / 蚂蚁邦邦等）：都存在，但闭源 + 上传账号到云 + 不开源，**和 MediaForge 定位不同**

**结论：MediaForge 要做的"AI 风格学习 + 改写 + 一键发公众号 + X + 小红书 + B 站 + 知乎 + Reddit + HN + Product Hunt"完整闭环，目前没有一个开源产品覆盖全**。最接近的 artipub 差在 AI 改写 + 海外平台 + 现代维护。可以放心做。**唯一重叠风险点是 artipub 的中文技术博客圈部分**，要差异化建议聚焦：
- AI 风格学习（这是 artipub 完全没做的）
- 海外平台（X/Reddit/HN/Product Hunt，artipub 完全没有）
- AI Agent Skill 化（让 Claude Code / Cursor / Codex 能直接调用，符合 2026 agent 生态趋势）

### D. 风格学习 / Prompt 优化侧最具复用价值的项目

- **langchain-ai/langgraph**（图结构编排，多步写作 pipeline 必备）
- **danielmiessler/Fabric**（单职责 pattern 集合，可直接抄结构做内部风格模板库）
- **promptfoo/promptfoo**（风格一致性自动评估）
- 加上 few-shot + 反向约束（"禁用词列表"）这套业界共识做法，**不需要再自研 prompt 框架**

---

## 附：MediaForge 直接可装/可调用的清单

| 用途 | 推荐项目 | 许可证 | 调用方式 |
|------|----------|--------|----------|
| 对话前端 | shadcn-ui/chatbot-template | MIT | 直接 fork |
| 多能力骨架 | LibreChat | MIT | 拆模块参考，**不要整库 fork**（太重） |
| 后台/CMS | Strapi | MIT（README 写）/ Other（GitHub 标签）—— 需自验 | 可直接 fork |
| 链接解析（主） | jina-ai/reader | Apache-2.0 | REST API / MCP |
| 链接解析（备） | firecrawl | AGPL-3.0（注意传染） | 仅 HTTP 调用 |
| 文档解析 | Unstructured-IO/unstructured | Apache-2.0 | pip install |
| 微信个人号/号 SDK | Wechaty | Apache-2.0 | npm install |
| 公众号发布 | wechat-mp-publisher | ISC | npm install |
| 公众号抓 Markdown | jackwener/wechat-article-to-markdown | MIT | pip install + MCP |
| AI 编排 | langgraph + langchain | MIT | pip install |
| 风格 pattern | Fabric | MIT | 参考 + 改造 |
| Prompt 评估 | promptfoo | MIT | CLI + CI |

> 数据快照时间：2026 上半年。所有 star 数据来自第三方分析站点/搜索结果，非实时 GitHub API；如要精确数字，请用 GitHub API 直接拉。
