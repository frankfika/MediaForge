import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    environment: "happy-dom",
    include: ["lib/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
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
      },
    },
  },
});
