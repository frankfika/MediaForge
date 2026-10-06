import { expect, test } from "@playwright/test";

test("/api/health reports llm mode", async ({ request }) => {
  const body = await (await request.get("/api/health")).json();
  expect(["mock", "anthropic"]).toContain(body.mode);
});
