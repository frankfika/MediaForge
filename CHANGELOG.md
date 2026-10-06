# Changelog

Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

## [Unreleased]

### Added

- `pnpm test:xhs` real-network XHS fetch script and `docs/xhs-cookie-test.md`.
- Prettier applied repo-wide; `llm.ts` per-file coverage threshold (90% lines/branches).

### Planned (v0.2)

- Real LLM integration verification (Anthropic path end to end, beyond the mock).
- Full blind-test loop for style learning (learn -> generate -> blind compare -> refine).
- Higher success rate for XHS fetches with a real login session.
- i18n (UI is zh-CN only today).

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
