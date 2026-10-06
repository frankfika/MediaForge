# MediaForge v0.1.0

Paste any link, get platform-native posts (公众号 / X / 小红书 / B站) in your own voice. Works with zero config via a mock LLM; set `ANTHROPIC_API_KEY` for real output.

## Highlights

- **Rewrite** any URL into 4 platforms, with export (WeChat inline HTML, txt/Markdown, ZIP).
- **Styles**: learn a voice from samples, refine, version, roll back, optional Postgres sync.
- **Style judge** (new): deterministic scoring of a text against a style — sentence length, vocabulary, rhythm, sentence count, taboos. No LLM needed.
- **MCP server**, ⌘K chat drawer, `/showcase`, Playwright e2e, CI.

## Commits

1. `74d52ae` R2 — skeleton: Next.js 15 / Tailwind v4 / cva UI, 5 pages
2. `40bcceb` R3 — export pipeline, ⌘K drawer, Firecrawl fallback, DB client
3. `814ef66` R4 — cloud styles + rollback, MCP server, XHS cookie settings
4. `a103b6e` R5 — demo styles, mock LLM, try-it button, health, 15 tests
5. `1e1c7fa` R6 — error pages, empty states, CI, LICENSE, deploy docs
6. `019e9b9` R7 — Playwright e2e, CI e2e job, .env.example polish
7. `e8134c4` R8 — README screenshots (5 PNG), CHANGELOG v0.1.0
8. `9a3ec2b` R9 — demo GIF, `/showcase` page, OG image
9. `be6e54f` R10 — style judge (5 signals + 8 tests), 测评 UI, GitHub issue/PR templates
10. `af39a2d` R11 — style import/export JSON, theme toggle (light/dark/system), `pnpm demo:mcp`
11. `856f3bf` R12 — social-preview 1280x640, release workflow, Drizzle SQL migration
12. `860002a` R13 — Vitest coverage (v8), Dockerfile + docker-compose, style version diff API
13. `45eadcc` R14 — fetcher coverage 9%→98% (+ 20 tests), 3 real-flow e2e (import-export, judge, demo-flow)
14. `7661ad4` R15 — styles-store + cookie + utils unit coverage (overall 55%→65%)
15. `14684db` R16 — export 100%, styles-db 100%, styles-sync 92.85% (overall 65%→92%)
16. `e028960` R17 — ai.ts 100% + llm/style-transfer 95%+ + ESLint flat config + Prettier (overall 92%→98%)
17. `a961643` R18a — apply Prettier across the repo (59 files reformatted)
18. `6472119` R18 — llm.ts branch coverage 100%, `pnpm test:xhs` real-network script, docs/xhs-cookie-test.md, CHANGELOG Unreleased
19. `67536b2` R19 — 4 new e2e (chat-drawer/settings/editor/styles-cloud), lib/types.ts schema tests, fix /api/compose mock mode, dependabot+stale.yml, docs/v0.2.0.md, lint 0 warnings
20. `e816a40` R20 — chat.tsx mount tests (9), /api/embed + lib/embed.ts, /showcase demo, fix e2e/chat-drawer inert assertion, overall coverage 98.2%→99.8%
21. `271a5b1` R21 — /search semantic-search demo (cosineSim + 64-dim vectors), chat.tsx catch test, 4 new e2e (search/styles-refine)
22. `b02ddcc` R22 — /api/metrics counter (7 keys, file persistence), branches coverage 91.8%→97.7%, flake-proof chat-drawer e2e
23. `cf6cf1c` R23 — hand-rolled i18n zh/en (100+ keys, ServerLocale context, useSyncExternalStore hook), 15 components localised, cookie-based lang switch
24. `82101c9` R24 — lib/i18n.test.ts (23 tests, anti-miss zh/en key parity), e2e/i18n.spec.ts (2 tests: zh↔en toggle + cookie survives reload), fix styles page hardcoded heading, fix DICTS[unknown-locale] crash
25. `d9973e9` R25 — i18n sweep on /styles page (11 hardcoded zh strings → t(), useT() on 4 inner components), e2e/i18n.spec.ts +1 case
26. `cf812af` R26 — docs/project-status.md (single-source-of-truth: shipped evidence + quality gates + no-keys demo path + user switches + v0.2 backlog + push commands)
27. `627edb5` R27 — /api/embed now uses getOpenAIProvider() when OPENAI_API_KEY is set; falls back to deterministic mock on absence or upstream error; response now includes provider/model/dim; +6 tests.
28. `3a786fe` R28 (tag) — /api/styles/[id]/export single-file download (cloud path; slug filename; 503 NO_DB without DB; throws Response with content-disposition). docs/project-status.md refreshed (27→28 commits, OpenAI provider no longer 'swap lib/embed.ts').

## Known limits

- The judge is heuristic (char-bigram vocabulary, S/M/L rhythm); the LLM blind-test loop in `docs/style-agent.md` §6 is not implemented.
- Without references, the judge synthesizes one from the style's features, so scores are indicative only.

## Thanks

Built with Next.js, Tailwind, Vercel AI SDK, Drizzle, Motion, Vitest and Playwright. Thanks to everyone who files issues.

## Cutting a release

`.github/workflows/release.yml` runs typecheck + test + build, then publishes a GitHub Release whose notes are the matching `## [x.y.z]` section of `CHANGELOG.md`, with a source tarball attached.

```bash
git remote add origin git@github.com:frankfika/MediaForge.git   # once
git push -u origin main
git push origin v0.1.0        # or: git push --tags  → triggers the release
```

Re-run for an existing tag: Actions → Release → Run workflow → enter `v0.1.0`.
Add a `## [x.y.z]` section to CHANGELOG.md _before_ tagging, or the workflow fails.

GitHub Social Preview: upload `docs/assets/social-preview.png` (1280×640) at Settings → Social preview. Regenerate with `node scripts/og-image.mjs`.
