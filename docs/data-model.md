# Data Model

实现:`lib/db/schema.ts`(Drizzle + Neon Postgres)。**MVP 骨架未接库**:风格存浏览器 localStorage(`lib/styles-store.ts`,结构 = 下表 `Style`),文章/产物不落库。迁移时只替换 store 实现与路由持久化。

```
users ─┬─< styles ─┬─< style_versions   (append-only: prompt, features, changelog)
       │           └─< style_samples    (sourceUrl?, text)
       └─< articles ─< outputs          (platform, title, body, media, copiedAt)
                 └── styleId? (set null on style delete)
```

| 表               | 关键字段                                                                      | 说明                                                       |
| ---------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `users`          | id, email                                                                     | 登录后启用                                                 |
| `styles`         | id, userId, name, currentVersion                                              | 风格主记录                                                 |
| `style_versions` | styleId, version, **prompt**, features(jsonb), changelog                      | 每次 learn/refine 追加;回滚 = 把 currentVersion 指回旧版本 |
| `style_samples`  | styleId, sourceUrl?, text                                                     | 保留样本以便重新学习/评测                                  |
| `articles`       | userId, styleId?, mode(`rewrite`\|`compose`), sourceUrl, source(jsonb), draft | 一次创作任务                                               |
| `outputs`        | articleId, platform(enum), title?, body, media(jsonb), **copiedAt**           | 每平台一条;`copiedAt` 是隐式质量信号                       |

## 约束与决策

- `platform` 为 PG enum,值来自 `PLATFORMS` 常量(单一事实来源,TS 与 DB 同步)
- 删用户 → 级联删除;删风格 → 文章 `styleId` 置空(不丢历史)
- `source` 存规范化快照(jsonb),而非引用 URL —— 链接会失效
- 媒体只存 URL,不存二进制;ZIP 导出时按需代理抓取
- 索引(Phase 2):`articles(userId, createdAt desc)`、`style_versions(styleId, version)` unique

## 客户端类型 ↔ 表

`Style` = `styles` + 最新 `style_versions` 行;`RewriteResult.posts[i]` = `outputs` 行(无 id/时间戳)。
