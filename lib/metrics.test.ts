import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/metrics/route";
import { inc, KEYS, reset, snapshot } from "./metrics";

let file: string;
beforeEach(() => {
  file = join(mkdtempSync(join(tmpdir(), "mf-")), "sub", "metrics.json");
  process.env.METRICS_FILE = file;
  reset();
});

describe("metrics", () => {
  it("starts at zero when the file is missing", () => {
    expect(snapshot()).toEqual({ rewrites: 0, composes: 0, learns: 0, refines: 0, exports: 0, embeds: 0, fetches: 0 });
  });
  it("increments and persists", () => {
    inc("rewrites");
    inc("rewrites");
    inc("embeds");
    expect(snapshot()).toMatchObject({ rewrites: 2, embeds: 1, learns: 0 });
    expect(JSON.parse(readFileSync(file, "utf8"))).toMatchObject({ rewrites: 2, embeds: 1 });
  });
  it("reloads saved counts, ignoring junk values", () => {
    inc("fetches");
    writeFileSync(file, JSON.stringify({ fetches: 5, learns: "x" }));
    reset();
    expect(snapshot()).toMatchObject({ fetches: 5, learns: 0 });
  });
  it("tolerates a corrupt file", () => {
    inc("fetches");
    writeFileSync(file, "{bad");
    reset();
    expect(snapshot().fetches).toBe(0);
  });
  it("keeps counting when the file can't be written", () => {
    process.env.METRICS_FILE = join(file, "..", "..", "x\0y"); // invalid path
    reset();
    inc("exports");
    expect(snapshot().exports).toBe(1);
  });
  it("snapshot is a copy", () => {
    snapshot().composes = 99;
    expect(snapshot().composes).toBe(0);
  });
  it("GET /api/metrics returns the snapshot", async () => {
    inc("learns");
    const body = await GET().json();
    expect(Object.keys(body)).toEqual([...KEYS]);
    expect(body.learns).toBe(1);
  });
});

describe("default path", () => {
  it("falls back to .data/metrics.json when METRICS_FILE is unset", () => {
    delete process.env.METRICS_FILE;
    reset();
    expect(() => snapshot()).not.toThrow(); // read only; no write, so the repo's .data stays untouched
  });
});

describe("route wiring", () => {
  beforeEach(() => {
    process.env.METRICS_FILE = join(mkdtempSync(join(tmpdir(), "mf-")), "m.json");
    reset();
  });
  const call = (h: (r: Request) => Promise<Response>, body: unknown) =>
    h(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));
  it("embed and export bump their counters", async () => {
    await call((await import("@/app/api/embed/route")).POST, { texts: ["a"] });
    await call((await import("@/app/api/export/route")).POST, { posts: [{ platform: "wechat", title: "t", body: "b" }] });
    expect(snapshot()).toMatchObject({ embeds: 1, exports: 1, rewrites: 0 });
  });
  it("rewrite (source given, mock LLM), learn and refine bump theirs", async () => {
    const src = { url: "https://e.com", title: "t", author: "a", text: "正文。".repeat(30), images: [], videos: [] };
    await call((await import("@/app/api/rewrite/route")).POST, { source: src, platforms: ["xhs"] });
    const learn = await call((await import("@/app/api/style/learn/route")).POST, { name: "n", samples: ["短句。再来一句。"] });
    await call((await import("@/app/api/style/refine/route")).POST, { style: await learn.json(), feedback: "更短" });
    await call((await import("@/app/api/compose/route")).POST, { prompt: "主题" });
    expect(snapshot()).toMatchObject({ rewrites: 1, learns: 1, refines: 1, composes: 1 });
  });
});
