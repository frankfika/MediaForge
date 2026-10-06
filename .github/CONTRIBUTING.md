# Contributing

## 本地开发

```bash
pnpm install
cp .env.example .env.local   # 不填 key 也能跑(mock LLM)
pnpm dev
```

提交前必须全部通过:

```bash
pnpm typecheck && pnpm test && pnpm build
```

## Commit 约定

[Conventional Commits](https://www.conventionalcommits.org/):`feat:` `fix:` `docs:` `refactor:` `test:` `chore:`,一个 commit 做一件事。

## PR 规范

- 从 `main` 切分支,PR 目标是 `main`;CI(typecheck / test / build)必须绿
- 描述写清:改了什么、为什么、怎么验证;UI 改动附截图
- 新逻辑带测试(vitest,`lib/*.test.ts`);不要引入依赖 key 才能跑的测试
- 保持约定:TS strict、Tailwind v4 OKLCH tokens、`cva` + `cn`;不引入 LangGraph 等编排框架(见 [architecture](../docs/architecture.md))
- 新依赖需在 PR 里说明为什么标准库/现有依赖不够
