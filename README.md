<div align="center">

# MediaForge

**贴一个链接,或说一个话题。AI 用*你的*文风,写给公众号、X、小红书、B 站。复制,发布。**

Paste a link or a topic. AI writes it in _your_ voice for WeChat, X, Xiaohongshu and Bilibili. Copy, publish.

[![typecheck](https://img.shields.io/badge/typecheck-passing-brightgreen)](.github/workflows/ci.yml)
[![test](https://img.shields.io/badge/test-15%20passed-brightgreen)](.github/workflows/ci.yml)
[![build](https://img.shields.io/badge/build-passing-brightgreen)](.github/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

<img src="docs/assets/og.png" alt="MediaForge" width="720" />

</div>

## Quick Start

```bash
pnpm install                      # 1. 安装(Node 22 + pnpm 10)
cp .env.example .env.local        # 2. 复制环境变量(不填 key 也能跑:mock LLM)
pnpm dev                          # 3. http://localhost:3000
```

4. **第一行玩起来**:打开首页 → 点「试一下:示例风格 + example.com → 4 平台」,无需任何 key;或粘贴 `https://x.com/<user>/status/<id>` 让 Agent 抓取并改写。

<img src="docs/assets/demo.gif" alt="demo" width="720" />

## Features

|                | 特性                                                                                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **对话优先**   | 抓取、改写、学风格都是 agent 的 _tool_,UI 只渲染工具结果。<br/><img src="docs/assets/chat-drawer.png" alt="chat" width="480" />                                                                      |
| **改写模式**   | 链接(X / 小红书 / B 站 / 公众号 / 任意文章)→ 抓取 → 选平台 → 一键复制,图片视频原样保留。<br/><img src="docs/assets/rewrite.png" alt="rewrite" width="480" />                                         |
| **创作模式**   | 话题 + 参考链接 → 流式长文 → 适配多平台。<br/><img src="docs/assets/demo-output.png" alt="editor" width="480" />                                                                                     |
| **风格 Agent** | 3–5 篇样本 → 语音特征 → 风格 Prompt;可用反馈或*你的手改*迭代,支持版本回滚与云同步。<br/><img src="docs/assets/styles.png" alt="styles" width="480" />                                                |
| **导出与 MCP** | 公众号内联 HTML、ZIP 打包;MediaForge 本身也是 MCP server,可被 Claude Code / Cursor / Codex 调用([docs/mcp.md](docs/mcp.md))。<br/><img src="docs/assets/demo-output.png" alt="export" width="480" /> |

无 `ANTHROPIC_API_KEY` 时所有路由返回确定性 mock(响应里 `"llm": "mock"`,右下角有徽章),方便试用与测试。

## Showcase

`pnpm dev` 后访问 [`/showcase`](http://localhost:3000/showcase),逐个预览 Button、PostTabs、PlatformPicker、Chat、LlmModeBadge、EmptyState。

## Architecture

```
┌──────────────┐   HTTPS    ┌──────────────────────────┐        ┌───────────────────────┐
│   Browser    │ ─────────▶ │  Vercel (Next.js 15)     │ ─────▶ │ Anthropic API (LLM)   │
│ React 19 UI  │ ◀───────── │  App Router + Route      │ ─────▶ │ Source sites / fxtwit │
│ localStorage │  stream    │  Handlers (Node runtime) │ ─────▶ │ Firecrawl (optional)  │
└──────────────┘            └────────────┬─────────────┘        └───────────────────────┘
                                         │ DATABASE_URL (optional)
                                         ▼
                            ┌──────────────────────────┐
                            │ Neon Postgres + Drizzle  │  风格云同步 / 版本
                            └──────────────────────────┘
```

详见 [docs/architecture.md](docs/architecture.md)。

## Tech Stack

| 层        | 选型                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------- |
| 框架      | Next.js 15 App Router · React 19 · TypeScript (strict)                                         |
| UI        | Tailwind v4 (OKLCH tokens) · shadcn 约定(`cva` + `cn`) · Motion · lucide                       |
| AI        | Vercel AI SDK v5(`useChat` / `streamText` / tool-use)· Claude Sonnet 4.5 默认;不引入 LangGraph |
| 抓取      | `@mozilla/readability` + `linkedom`;X 走 fxtwitter;B 站走 view API;Firecrawl 兜底              |
| 数据      | Neon Postgres + Drizzle(可选;默认 localStorage)                                                |
| 集成      | `@modelcontextprotocol/sdk`(stdio MCP server)· `jszip`                                         |
| 测试 / CI | Vitest · GitHub Actions                                                                        |

## Configuration

| 变量                | 必需          | 说明                         |
| ------------------- | ------------- | ---------------------------- |
| `ANTHROPIC_API_KEY` | 否(缺省 mock) | 真实 LLM                     |
| `ANTHROPIC_MODEL`   | 否            | 默认 `claude-sonnet-4-5`     |
| `FIRECRAWL_API_KEY` | 否            | 登录墙页面兜底抓取           |
| `DATABASE_URL`      | 否            | Neon Postgres,启用风格云同步 |
| `JINA_API_KEY`      | 否            | **预留**,当前代码尚未读取    |

## Deployment

Vercel + Neon,约 5 分钟:

1. 导入 GitHub 仓库到 Vercel(自动识别 Next.js)
2. Neon 新建项目,`DATABASE_URL="…" pnpm db:push`
3. 在 Vercel 配置上表环境变量,Deploy
4. 访问 `/api/health` 确认 `llm` 字段

完整说明:[docs/deployment.md](docs/deployment.md)。

### Docker 自托管

```bash
docker compose up -d --build                 # 仅应用,http://localhost:3000
docker compose --profile db up -d --build    # 附带 Postgres(DATABASE_URL=postgres://mf:mf@db:5432/mediaforge)
```

环境变量同上表,留空 `ANTHROPIC_API_KEY` 即 mock LLM。

### First push

本机首次推送到 GitHub:

```bash
git remote add origin git@github.com:frankfika/MediaForge.git   # 仅需一次
pnpm push            # 检查 .env/secrets 泄漏 + remote/tag 存在,然后 push main 和 v0.1.0 tag
pnpm push -- --check # 只跑检查,不推送(dry run)
```

推送后 Actions → Release workflow 会基于 tag 发 GitHub Release(CHANGELOG 需先有对应 `## [x.y.z]` 段)。

## Project Status

**v0.1.0** — 5 页面 · 13 个 API · MCP server · mock LLM · 演示数据 · 15 个单测。

Roadmap:

- [ ] 真实 key 下的端到端验证与 prompt 调优
- [ ] 登录态抓取成功率(只能尽力而为)
- [ ] Jina Reader 抓取后端
- [ ] 平台发布自动化
- [ ] e2e 测试、Storybook

文档:[architecture](docs/architecture.md) · [product-spec](docs/product-spec.md) · [style-agent](docs/style-agent.md) · [api](docs/api.md) · [data-model](docs/data-model.md) · [mcp](docs/mcp.md) · [ui-style-guide](docs/ui-style-guide.md)

## Contributing

欢迎 PR。`pnpm typecheck && pnpm test && pnpm build` 通过即可;详见 [CONTRIBUTING](.github/CONTRIBUTING.md)。

## License

[MIT](LICENSE)

## Acknowledgments

- [Firecrawl](https://github.com/mendableai/firecrawl) — 登录墙页面兜底抓取(可选集成)
- [Jina Reader](https://github.com/jina-ai/reader) · [Unstructured](https://github.com/Unstructured-IO/unstructured) — 调研参考(见 [research/](research/MEDIAFORGE_OPEN_SOURCE_LANDSCAPE.md)),尚未作为依赖接入
- [JSZip](https://github.com/Stuk/jszip) — 浏览器端 ZIP 打包
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk) — MCP server
- [Mozilla Readability](https://github.com/mozilla/readability) · [linkedom](https://github.com/WebReflection/linkedom) · [Vercel AI SDK](https://github.com/vercel/ai) · [Vercel AI Chatbot](https://github.com/vercel/ai-chatbot)(产品形态参考)
