# 部署 Deployment

## 必备环境

| 服务              | 必需?        | 用途                                                           |
| ----------------- | ------------ | -------------------------------------------------------------- |
| Anthropic API key | 生产建议必需 | 真实 LLM;缺省走确定性 mock(`/api/health` 返回 `"llm": "mock"`) |
| Neon Postgres     | 可选         | 风格云同步 / 版本回滚;缺省只用浏览器 localStorage              |
| Firecrawl         | 可选         | 登录墙页面(小红书、公众号)兜底抓取                             |
| Jina              | 可选 / 预留  | `JINA_API_KEY` 目前**代码未读取**,仅为后续 Reader 抓取预留     |

运行时:Node 22,pnpm 10。

## Vercel(约 5 分钟)

1. Fork / push 到 GitHub,在 Vercel 点 _Add New → Project_ 导入仓库(自动识别 Next.js)。
2. Build command `pnpm build`,Output 默认(`.next`),Install `pnpm install --frozen-lockfile`。
3. 配置环境变量:

| 变量                | 说明                     |
| ------------------- | ------------------------ |
| `ANTHROPIC_API_KEY` | 真实 LLM                 |
| `ANTHROPIC_MODEL`   | 默认 `claude-sonnet-4-5` |
| `DATABASE_URL`      | Neon 连接串(可选)        |
| `FIRECRAWL_API_KEY` | 兜底抓取(可选)           |

4. Deploy。打开 `/api/health` 确认 `llm` 字段。

## Neon Postgres

1. [neon.tech](https://neon.tech) 新建项目,复制 connection string(带 `sslmode=require`)。
2. 本地推送 schema:

```bash
DATABASE_URL="postgresql://…" pnpm db:push
```

3. 把同一个 `DATABASE_URL` 加到 Vercel 环境变量并重新部署。`/styles` 页会出现云同步选项。

## 自托管

不需要 Docker compose。`Node 22` + `pnpm build && pnpm start`(端口 3000)即可;Postgres 可选,任何标准 Postgres 以外的驱动不保证(当前用 `@neondatabase/serverless`,需 Neon 或兼容的 HTTP/WebSocket 端点)。

## 性能 Performance

- 当前全部 Route Handler 使用默认 **Node.js runtime**,并设置 `maxDuration`:chat / rewrite / refine / global-chat 60s,compose / style-learn 120s。Vercel Hobby 计划上限更低(以官方当前限额为准),超出需 Pro 或调小。
- **没有评估迁移到 Edge runtime**:抓取依赖 `linkedom` + `@mozilla/readability`,Edge 兼容性未验证;LLM 流式响应在 Node runtime 下已足够。如要迁移,先逐路由实测(尤其 `fetcher`、`jszip`、`drizzle`)。
- 抓取是主要延迟来源(外部站点),LLM 为第二位。
