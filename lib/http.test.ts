import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { post, route } from "./http";

const req = (body: string) => new Request("http://x/api", { method: "POST", body });
const h = route(z.object({ n: z.number() }), async ({ n }) => {
  if (n < 0) throw new Error("negative");
  return n === 0 ? new Response("raw", { status: 202 }) : { doubled: n * 2 };
});

describe("route", () => {
  it("returns handler JSON", async () => expect(await (await h(req('{"n":2}'))).json()).toEqual({ doubled: 4 }));
  it("passes a Response through", async () => expect((await h(req('{"n":0}'))).status).toBe(202));
  it("400 on schema violation", async () => expect((await h(req('{"n":"a"}'))).status).toBe(400));
  it("400 on invalid JSON", async () => expect((await h(req("{bad"))).status).toBe(400));
  it("500 with message when handler throws", async () => {
    const res = await h(req('{"n":-1}'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "negative" });
  });
});

describe("post", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("sends JSON and returns the parsed body", async () => {
    const f = vi.fn(async () => Response.json({ ok: 1 }));
    vi.stubGlobal("fetch", f);
    expect(await post("/api/x", { a: 1 })).toEqual({ ok: 1 });
    expect(f).toHaveBeenCalledWith("/api/x", expect.objectContaining({ method: "POST", body: '{"a":1}' }));
  });
  it("throws the server error message on non-2xx", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ error: "nope" }, { status: 500 }));
    await expect(post("/api/x", {})).rejects.toThrow("nope");
  });
});
