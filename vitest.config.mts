import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } }, // tsconfig has jsx:preserve (Next); tests need real JSX
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    env: { METRICS_FILE: join(tmpdir(), "mediaforge-test-metrics.json") }, // keep tests out of .data/
    environment: "happy-dom",
    pool: "vmThreads",
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx"],
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "components/chat.tsx"],
      exclude: ["lib/**/*.test.ts", "lib/db/**", "lib/mcp-server.ts"],
      reporter: ["text", "json-summary", "html"],
      // Overall is ~65% (styles-db/styles-sync/ai.ts untested), so enforce only on the pure-logic modules.
      thresholds: {
        "lib/fetcher.ts": { lines: 90, branches: 80 },
        "lib/http.ts": { lines: 90 },
        "lib/export.ts": { lines: 90 },
        "lib/styles-db.ts": { lines: 90 },
        "lib/styles-sync.ts": { lines: 85 },
        "lib/styles-store.ts": { lines: 90, branches: 90 },
        "lib/cookie.ts": { lines: 90, branches: 90 },
        "lib/llm.ts": { lines: 90, branches: 90 },
        "lib/utils.ts": { lines: 100 },
        "lib/embed.ts": { lines: 100 },
        "components/chat.tsx": { lines: 90 },
        lines: 99, // overall floor
      },
    },
  },
});
