import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "happy-dom", include: ["lib/**/*.test.ts"], exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.test.ts", "lib/db/**", "lib/mcp-server.ts"],
      reporter: ["text", "json-summary", "html"],
      // thresholds are intentionally unset (report only); to enforce, add e.g. thresholds: { lines: 60 }.
    },
  },
});
