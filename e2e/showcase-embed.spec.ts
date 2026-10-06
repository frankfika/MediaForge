import { expect, test } from "@playwright/test";

test("showcase: Embeddings demo returns a 64-dim vector, Chat preview renders", async ({ page }) => {
  await page.goto("/showcase");
  await expect(page.getByText("今天想发点什么?")).toBeVisible();
  await page.getByRole("button", { name: "Embed" }).click();
  await expect(page.getByTestId("embed-out")).toContainText("64 dims");
});

test("POST /api/embed: deterministic, validates body", async ({ request }) => {
  const a = await (await request.post("/api/embed", { data: { texts: ["x", "y"] } })).json();
  const b = await (await request.post("/api/embed", { data: { texts: ["x"] } })).json();
  expect(a.embeddings).toHaveLength(2);
  expect(a.embeddings[0]).toEqual(b.embeddings[0]);
  expect((await request.post("/api/embed", { data: { texts: "nope" } })).status()).toBe(400);
});
