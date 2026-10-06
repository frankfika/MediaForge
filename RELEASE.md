# MediaForge v0.1.0

Paste any link, get platform-native posts (公众号 / X / 小红书 / B站) in your own voice. Works with zero config via a mock LLM; set `ANTHROPIC_API_KEY` for real output.

## Highlights
- **Rewrite** any URL into 4 platforms, with export (WeChat inline HTML, txt/Markdown, ZIP).
- **Styles**: learn a voice from samples, refine, version, roll back, optional Postgres sync.
- **Style judge** (new): deterministic scoring of a text against a style — sentence length, vocabulary, rhythm, sentence count, taboos. No LLM needed.
- **MCP server**, ⌘K chat drawer, `/showcase`, Playwright e2e, CI.

## Commits
1. `74d52ae` v0.1 skeleton — Next.js 15 / Tailwind v4 / cva UI, 5 pages
2. `40bcceb` R3 — export pipeline, ⌘K drawer, Firecrawl fallback, DB client
3. `814ef66` R4 — cloud styles + rollback, MCP server, XHS cookie settings
4. `a103b6e` R5 — demo styles, mock LLM, try-it button, health, tests
5. `1e1c7fa` R6 — error pages, empty states, CI, LICENSE, deploy docs
6. `019e9b9` R7 — Playwright e2e, CI e2e job
7. `e8134c4` R8 — README screenshots, CHANGELOG
8. `9a3ec2b` R9 — demo GIF, `/showcase`, OG image
9. R10 — style judge, `/styles` 测评 button, issue/PR templates, this file

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
Add a `## [x.y.z]` section to CHANGELOG.md *before* tagging, or the workflow fails.

GitHub Social Preview: upload `docs/assets/social-preview.png` (1280×640) at Settings → Social preview. Regenerate with `node scripts/og-image.mjs`.
