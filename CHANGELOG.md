# Changelog

Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

## [Unreleased]

### Added

- `pnpm test:xhs` real-network XHS fetch script and `docs/xhs-cookie-test.md`.
- Prettier applied repo-wide; `llm.ts` per-file coverage threshold (90% lines/branches).
- Home page becomes a real dashboard: `components/dashboard.tsx` polls `/api/metrics` every 30s and shows 6 quick-action cards (`/rewrite`, `/editor`, `/styles`, `/search`, `/showcase`, `/settings`).
- `lib/openapi-spec.ts` is a 17-path OpenAPI 3.1 spec served at `/api/openapi.json`; rendered at `/docs` via Stoplight Elements loaded from a CDN.
- `/api/embed` accepts `OPENAI_API_KEY` and returns OpenAI `text-embedding-3-small` vectors; falls back to a deterministic 64-dim hash-seeded mock when the key is unset.
- `/api/search` semantic-search retrieval over a corpus (default 5 MediaForge intro docs or `?corpus=a,b,c&topK=2`).
- `/api/metrics` in-memory counters mirrored to `.data/metrics.json`; resets only on missing or corrupt JSON.
- `i18n` with locales `zh`, `en`, `ja`, `ko` and a per-locale ServerLocale context for SSR stability.
- `next/theme` style toggle (light / dark / system), persisted to a cookie.
- `/api/styles/[id]/duplicate` and `/api/styles/[id]/rename` cloud routes.
- `/api/styles/[id]/history` returns `{ versions: StyleVersion[] }`; semantic alias of the style-detail GET.
- `/api/embed/{query}` GET retrieval with `?corpus=` and `?topK=` overrides.
- `/api/health` returns 200 with `services.{postgres, metricsFile, metricsExists}` plus the full 22-endpoint list; returns 503 only if the metrics file is completely unwritable.
- `/api/ping` trivial 200 liveness probe for load-balancer health checks.
- `/api/health` body now also exposes `build.sha` (`VERCEL_GIT_COMMIT_SHA` / `GIT_COMMIT_SHA` / `'dev'` fallback), `build.builtAt`, and `uptime` (seconds).
- 14 new e2e specs (full list in `docs/project-status.md`); Playwright suite is now 38 specs, all run offline (no real network) after `e2e/demo-flow.spec.ts` + `e2e/try-demo.spec.ts` switched to `context.route()` stubs.
- `vitest` 19 files / 290 tests.
- ESLint 0 warnings, Prettier pass, line coverage 99.83 %, branch coverage 98.01 %.
- `vercel.json` for one-click Vercel import (framework, route-cache headers, region hint, $schema-pinned).
- `scripts/push.sh` (secret-leak + remote + tag checks, `--check` dry-run, GitHub Release URL hint).
- `.editorconfig` (IDE-agnostic baseline; per-extension rules).
- `lib/mcp-server.ts` + `pnpm demo:mcp` for stdio MCP server consumed by Claude Code / Cursor / Codex.
- `docs/mcp-guide.md` shipped as `public/mcp-guide.md` so onboarding step 4 links don't 404.
- `docs/release-notes.md` (Chinese user-story release blog).
- `docs/project-status.md` (single source of truth for shipped / tested / what's left).
- `docs/v0.2.0.md` roadmap.
- `docs/deployment.md` (Vercel + Neon + Docker self-host).

### Changed

- `lib/i18n.ts` keys 0 -> 175; parity test prevents silent locale drift.
- `components/nav.tsx` gains `nav.docs` (`/docs`).
- `app/page.tsx` no longer renders `<Chat />` directly; it renders `<Dashboard />` with `<Chat />` embedded at the bottom so the original `try-demo` e2e still passes.
- `e2e/demo-flow.spec.ts` and `e2e/try-demo.spec.ts` no longer hit example.com; Playwright `context.route()` serves a fixed HTML so the two slowest / flakiest e2e pass offline in <2 s.
- `chat.tsx` `SUGGESTIONS` is now `[label, query]` pairs; clicking a chip now fills the textarea with the i18n-translated query string instead of reusing the label.

### Fixed

- `lib/styles-db.ts#toVersion` — `features` from a Drizzle row is `jsonb` and the column is nullable; the cast previously leaked `null` through into `ApiStyle.features: required`, breaking the build path. Now normalises `null` to `undefined` before the cast.
- `lib/i18n.ts#t` — `DICTS[locale][key]` was not `null`-safe when called with an unknown locale; now falls through `DICTS.zh` first.
- The /api/embed POST body validation rejected any time the inputs list had any item longer than 8000 chars (still does — but now its error message points to the field instead of the array index).
- `<a href="/">` in `app/docs/page.tsx` switched to `<Link>` to satisfy `eslint-plugin-next/no-html-link-for-pages`.
- The `tsconfig.json` `moduleResolution: "bundler"` now plays nicely with the `process.cwd()-relative` import in `lib/openapi-spec.ts` (the route handler used to throw "module not found" during `next build`).

### Planned (v0.2)

- Real LLM integration verification (Anthropic path end to end, beyond the mock).
- Full blind-test loop for style learning (learn -> generate -> blind compare -> refine).
- Higher success rate for XHS fetches with a real login session.
- i18n (UI is zh-CN only today; English / Japanese / Korean are wired through the dictionary but not all copy is translated).

## [0.1.0] - 2026-10-06

### Added

- **Skeleton**: Next.js 15 + React 19 + Tailwind v4 (OKLCH tokens) + cva/shadcn-style UI; pages 对话 / 改写 / 创作 / 风格 / 设置.
- **Export pipeline** (R3): `/api/export` → WeChat inline-style HTML, X txt, XHS/Bilibili Markdown, `media.txt`; "复制到公众号" and in-browser ZIP download.
- **⌘K / Ctrl+K global chat drawer** (R3) with `/api/global-chat`.
- **Firecrawl fallback** in the fetcher when local extraction is empty (no-op without key); lazy Drizzle/Neon client (R3).
- **Styles cloud sync + version rollback** (R4): `/api/styles*` routes, append-only versions, local-first with silent degradation.
- **MCP server** (R4): `pnpm mcp` exposes `rewrite_url`, `compose_post`, `learn_style`, `refine_style`; see `docs/mcp.md`.
- **XHS cookie settings** (R4) for login-walled fetches.
- **Zero-config demo** (R5): mock LLM, 3 demo styles, home "试一下" button, LLM-mode badge, `/api/health`, 15 vitest tests.
- **Error pages, empty states, CI, LICENSE (MIT), deployment docs** (R6).
- **Playwright e2e** (3 specs) and CI e2e job (R7).
- **README screenshots** via `pnpm screenshots`; this changelog (R8).

### Changed

- `/api/rewrite`, `/api/style/learn`, `/api/style/refine` route through `lib/llm`, so they work without `ANTHROPIC_API_KEY` (R4/R5).
- `vitest.config.ts` → `.mts`; vitest excludes `e2e/` (R5/R7).

### Fixed

- Cache key includes whether the XHS cookie was used, so a failed anonymous fetch no longer poisons a later login retry (R4).
- `unique(styleId, version)` prevents concurrent refine forks (R4).

### Security

- SSRF guard (`assertPublic`) rejects localhost, RFC1918, link-local and non-http(s) URLs; tested in `lib/fetcher.test.ts`.
- XHS cookie is only sent to xiaohongshu.com / xhslink.com hosts. Client-side storage is base64 obfuscation, not encryption.
