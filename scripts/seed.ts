/**
 * pnpm seed — upload the demo styles to a running dev server's cloud store (needs DATABASE_URL on the server).
 * localStorage lives in the browser, so the no-DB path is the「加载演示风格」button on /styles.
 */
import { DEMO_STYLES } from "../lib/demo-styles";

const base = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  for (const { id, name, prompt, features } of DEMO_STYLES) {
    const res = await fetch(`${base}/api/styles`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, name, prompt, features }),
    }).catch(() => null);
    if (!res) {
      console.error(`✗ cannot reach ${base} — run pnpm dev first`);
      process.exit(1);
    }
    if (res.status === 503) {
      console.error(
        `✗ no database configured (${((await res.json()) as { code?: string }).code}). Without a DB open /styles and click「加载演示风格」instead.`,
      );
      process.exit(1);
    }
    console.log(res.ok ? `✓ ${name}` : `✗ ${name}: ${res.status}`);
  }
}

void main();
