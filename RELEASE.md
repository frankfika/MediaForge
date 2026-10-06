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
16. `e028960` R17 (tag) — ai.ts 100% + llm/style-transfer 95%+ + ESLint flat config + Prettier (overall 92%→98%)

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
