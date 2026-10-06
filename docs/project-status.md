# Project Status — MediaForge v0.1.0

> Last updated: tag `v0.1.0` at `d4ebf76` (25 commits).

This document is the single source of truth for **what works, what's tested, and what's left to ship**.

---

## Quick read

| Item                                                     | Status                          | Evidence                                         |
| -------------------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| Core flows (改写 / 创作 / 风格学习 / 风格修正)           | ✅ shipped                      | 4 pages + 13+ API endpoints                      |
| 4-platform adaptation (公众号 / X / 小红书 / B站)        | ✅ shipped                      | `lib/platforms.ts` + `lib/llm.ts#rewrite`        |
| Mock LLM fallback                                        | ✅ shipped                      | `lib/llm.ts` + every route picks it up           |
| Style Agent (learn / refine / version / rollback / diff) | ✅ shipped                      | `lib/styles-sync.ts` + `/api/styles/*`           |
| Local persistence (localStorage)                         | ✅ shipped                      | `lib/styles-store.ts` + `lib/styles-transfer.ts` |
| Cloud persistence (Postgres / Neon)                      | ✅ shipped, untested end-to-end | `lib/styles-db.ts` + Drizzle migration           |
| Chat-first UX (Chat / ⌘K drawer)                         | ✅ shipped                      | `components/chat-drawer.tsx`                     |
| Style judge (heuristic scoring)                          | ✅ shipped                      | `lib/style-judge.ts` + `/api/style/judge`        |
| MCP server (Claude Code / Cursor / Codex)                | ✅ shipped                      | `lib/mcp-server.ts` + `scripts/mcp-demo.mjs`     |
| Public WeChat rich-text + ZIP export                     | ✅ shipped                      | `lib/export.ts` + `components/post-card.tsx`     |
| /api/embed (semantic-search demo)                        | ✅ shipped, mock vectors        | `lib/embed.ts`                                   |
| /api/metrics (rewrites / composes / …)                   | ✅ shipped                      | `lib/metrics.ts`                                 |
| i18n (zh ↔ en)                                           | ✅ shipped                      | `lib/i18n.ts` + `lib/use-t.tsx`                  |
| Docker self-host                                         | ✅ shipped, image never built   | `Dockerfile` + `docker-compose.yml`              |
| Public deployment                                        | ⚠️ not done                     | user action — Vercel + Neon                      |

---

## Quality gates

| Check                        | Value                                   |
| ---------------------------- | --------------------------------------- |
| `pnpm typecheck`             | 0 errors                                |
| `pnpm lint`                  | 0 errors, 0 warnings                    |
| `pnpm format:check`          | passes                                  |
| `pnpm test` (vitest)         | **219 / 219 passing**, 18 files, ~0.7 s |
| `pnpm test:e2e` (playwright) | **20 / 20 passing**, ~28 s              |
| `pnpm build`                 | clean, 20 routes                        |
| Overall line coverage        | **99.81 %**                             |
| Overall branch coverage      | **97.71 %**                             |
| Open PRs / TODOs in code     | none significant                        |

CI runs all five on every push and PR to `main` (see `.github/workflows/ci.yml`).

---

## Where it runs without secrets

The default `pnpm dev` boot — **no `.env.local`, no keys, no DB** — already gives a complete demo:

1. Visit <http://localhost:3000>, see the welcome screen.
2. Click "试一下" — three demo styles load into localStorage and a sample URL rewrites into four platforms via mock LLM.
3. Open the `/styles` tab and pick a demo, or `learn` your own.
4. `/search` rounds the demo corpus and shows cosine-similarity scores over mock 64-dim vectors.
5. `pnpm demo:mcp` spawns the stdio MCP server in another terminal and lets Claude Code / Cursor / Codex call `rewrite_url` etc.

---

## What needs you

| To enable                | You provide                                                                       | Then                                                                       |
| ------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Real LLM output          | `ANTHROPIC_API_KEY=sk-ant-...`                                                    | `/api/health` shows `mode: "anthropic"`, badge turns green                 |
| Postgres cloud sync      | `DATABASE_URL=postgresql://…`                                                     | `/styles` exposes the "云端" tab + "立即同步" + version history + rollback |
| XHS login-walled fetches | paste cookie in `Settings` page or `XHS_COOKIE=…` env                             | `pnpm test:xhs <url>` + `/rewrite` get past the login wall                 |
| Real semantic search     | swap `lib/embed.ts` for OpenAI `text-embedding-3-small` (one function to replace) | `cosineSim` returns semantic scores                                        |
| Public deployment        | Vercel project + Neon project + 5 minutes of `.env` paste                         | see `docs/deployment.md`                                                   |

---

## What's still v0.2 (planned, not implemented)

- Style blind-test judge (`docs/style-agent.md` §6) — autonomous loop that refines a style until a held-out test gets ≥ 60 % indistinguishable from human.
- Postgres integration test in CI (currently requires `DATABASE_URL` on the runner).
- OpenAI embeddings provider (one replacement of `generateEmbeddings`).
- i18n strings still hard-coded as Chinese inside the chat `SUGGESTIONS` list (3 strings).

None of these are blockers for v0.1.0.

---

## How to release

```bash
git remote add origin git@github.com:<owner>/MediaForge.git   # one-time
git push -u origin main
git push origin v0.1.0        # triggers .github/workflows/release.yml
```

The release workflow runs `typecheck + test + build`, reads the `## [0.1.0]` section from `CHANGELOG.md`, packages a `git archive` source tarball, and creates the GitHub Release.

Upload `docs/assets/social-preview.png` (1280 × 640) at _GitHub → Social preview_ for a complete repo page.

---

## How to verify this document is current

```bash
git rev-parse --short HEAD    #  → commit hash at the top of this doc
git describe --tags --dirty    #  → v0.1.0-g<commits>g<hash> form
```
