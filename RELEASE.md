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
28. `3a786fe` R28 — /api/styles/[id]/export single-file download (cloud path; slug filename; 503 NO_DB without DB; throws Response with content-disposition). docs/project-status.md refreshed (27→28 commits, OpenAI provider no longer 'swap lib/embed.ts').
29. `fedbe1e` R30 (tag) — /api/search retrieval route (POST {query, corpus, topK} -> {provider, model, results[]}); /search page now hits the server route + shows provider/model badge; e2e for the new endpoint + body validation.
30. `e7ea085` R31 — chat suggestion chips: label (chat.sN) vs real query (new chat.sNQuery, zh placeholder-style / en imperative); chat.tsx functions 90.9%→100%; scripts/push.sh (secret-leak + remote/tag checks, pushes main + tag, --check dry run) + `pnpm push` + README First push section.
31. `5f1b8c3` R32 — components/onboarding.tsx + 12 i18n keys (firstRun.*): first-visit card on /showcase with 4 steps (styles/search/showcase/docs/mcp.md), localStorage flag `mediaforge.visited` with SSR-safe hydration gate, 4 unit tests + 1 e2e (dismiss survives refresh).
32. `896f8a1` R33 — onboarding step 4 link fixed: serve docs/mcp.md as public/mcp-guide.md so Next.js serves it. branches coverage 96.83%→98.01% via +6 unit tests in i18n/embed/export/styles-sync (no source changes).
33. `1356727` R34 — i18n gains a third locale (ja, ~170 keys, typed key parity), Playwright reporter adds 'github' in CI for PR annotations, e2e artifact uses 'if: always()' to always upload the report, new docs/release-notes.md (中文 user-story release post), README links it.
34. `4326318` R35-R37 — i18n adds fourth locale (ko, 157 keys, parity-tested); /api/styles/[id]/duplicate (cloud path, returns new uuid with 'name (copy)'); bug fix in toVersion() — features from drizzle jsonb is null | undefined, normalise to undefined before cast (otherwise ApiStyle.features: required rejects null).
35. `f89eb32` R38 — /api/styles/[id]/rename (styleRoute cloud path, drizzle update of styles.name, currentVersion/history untouched, zod name 1-60); GET /api/embed/[query] retrieval (?corpus= comma-separated or 5 default MediaForge docs, ?topK= default 5/max 50, reuses generateEmbeddingsAuto + cosineSim; parseEmbedQs in lib/embed.ts since Next route files allow no extra exports). 251→274 vitest (+23), 25→28 e2e (+3), lines 99.82%.
36. `ec2dc39` R39 — e2e/demo-flow + e2e/try-demo no longer hit example.com; Playwright context.route() serves a fixed HTML so these flake-prone cases pass offline in <2 s regardless of host reachability.
37. `f5b4741` R40 — home page is now a real dashboard: 18 dashboard.* i18n keys x 4 locales; components/dashboard.tsx (metric strip polled from /api/metrics every 30 s + 6 quick-action cards with lucide icons + footer pill + embedded <Chat /> so 'try-demo' e2e paths still pass); 3 new e2e (home renders, language round-trip, /api/metrics shape).
38. `274d107` R41/R42 — OpenAPI 3.1 spec at lib/openapi-spec.ts (16 paths, 6 schemas, UserIdHeader security scheme, NO_DB/NotFound/BadRequest shared responses); served by app/api/openapi.json/route.ts; rendered by /docs via Stoplight Elements CDN; nav + i18n gains 'nav.docs'; 6 unit tests + 3 e2e.
39. `9146c21` R43/R44 — README '5-minute tour' (10-step table, every step no-key) + Deployment rewritten with concrete Vercel+Neon flow (link signup, /api/health check, social-preview png upload); vercel.json (framework nextjs, route-cache headers, sin1 region, $schema pinned). Prettier newline cleanups.
40. `7821c80` R45 — OpenAPI examples for 5 core routes so /docs (Stoplight Elements) renders real request bodies and 200 responses: /api/rewrite request (URL + platforms + style + instruction) + 200 (source + media + 4 platform posts); /api/compose request; /api/style/learn request (name + 3 samples) + 200 (full style w/ features); /api/styles GET 200 (two sample styles).
41. `4ed6369` R46 — /api/health returns 200 with services.{postgres, metricsFile, metricsExists} so dashboards can graph degradations; lib/health.ts: pure never-throws checks (postgresPing, metricsFileWritable, pathReadable); /api/styles/[id]/history (semantic alias of GET /api/styles/{id}, returns { versions }); 5 unit tests + 2 e2e.
42. `ea78b1b` R47/R48 — .editorconfig (root + per-extension rules: utf-8, LF, 2-space, final newline, trim trailing whitespace except .md, tabs for Go/Rust, 4-space for Python) + 3 more OpenAPI examples (7 routes total now have copy-paste JSON in /docs): /api/embed POST request {texts: [...]} + response (vectors + provider/model/dim); /api/search POST request (query + corpus + topK) + response (ranked with score); /api/style/judge POST request (style + sampleText + referenceTexts) + response (score + 5 signals + feedback).
43. `a176aae` R49 — lib/uptime.ts (processStartedAt, uptimeSeconds, buildSha VERCEL_GIT_COMMIT_SHA | GIT_COMMIT_SHA | 'dev' fallback, buildTimestamp); /api/ping trivial 200 liveness probe for load-balancers; /api/health body now exposes build.{sha, builtAt}, uptime (seconds), and a 22-endpoint list (was 13; added /api/embed/{query}, /api/search, /api/style/judge, /api/styles/{id}/{duplicate,rename,export,history}, /api/openapi.json, /api/ping, /mcp-guide.md); 5 unit tests + 2 e2e.
44. `996e5b0` R50 — CHANGELOG Unreleased block backfills 49 rounds of work so the changelog is a single source of truth matching the live project-status doc; docs/release-notes.md v0.1 numbers block updated to the R49 end-state (191 files, ~11500 lines, 290 unit tests, 38 e2e, 4 locales, dashboard + OpenAPI viewer + MCP server + style blind-test + scripts/push.sh + .editorconfig + vercel.json).
45. `b21d6a9` R51/R52 — scripts/preview.sh
46. `e948504` R53 (tag) — 4 more OpenAPI examples (now 10 routes ship copy-paste JSON in /docs): /api/metrics response (rewrites/composes/learns/refines/exports/embeds/fetches snapshot); /api/chat request (messages + style) + response (AI SDK v5 UIMessage SSE snippet with rewrite_post tool-call event); /api/compose response (mock-LLM Markdown long-form draft); /api/embed/{query} response (provider+model+query+results). e2e/chat-metrics.spec.ts (3 e2e): /api/chat POST no-key returns 500 with error body (chat deliberately no mock fallback); /api/metrics GET returns all 7 numeric counters; /api/openapi.json has examples on >=10 routes.: deploy-pre smoke test (90 lines, bash, no new deps). Runs typecheck + 290 vitest + 38 e2e + next build + starts pnpm start, then 11 curl smoke checks: GET /, /showcase; /api/health 200 + mode:mock; /api/metrics shape; /api/openapi.json OpenAPI 3.1; /api/ping pong:true; /api/style/learn 400; /api/style/refine 400; /api/embed/{query} search-shape; /mcp-guide.md markdown. 'pnpm preview' / 'pnpm preview --keep' to leave the server running. Fix embed assertion: /api/embed/{query} is search retrieval shape (provider+model+query+results) not embed shape (dim).

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
