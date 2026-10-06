import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const getDb = vi.fn();
vi.mock("./db/client", () => ({ getDb: () => getDb() }));

import { addVersion, createStyle, deleteStyle, getStyle, listStyles, rollbackStyle, styleRoute } from "./styles-db";

/** Chainable, thenable fake: every builder call returns itself; awaiting pops the next queued result. */
function fakeDb(results: unknown[]) {
  const calls: string[] = [];
  const chain: any = new Proxy(() => {}, {
    get(_, k) {
      if (k === "then") {
        const r = results.shift();
        return (res: (v: unknown) => void) => res(r);
      }
      return (...a: unknown[]) => {
        calls.push(String(k));
        if (k === "transaction") return (a[0] as (tx: unknown) => unknown)(chain);
        return chain;
      };
    },
  });
  return { db: chain, calls };
}

const d = (s: string) => new Date(s);
const S = { id: "s1", userId: "u", name: "N", currentVersion: 2, createdAt: d("2024-01-01") };
const V = (version: number) => ({
  id: `v${version}`,
  styleId: "s1",
  version,
  prompt: `p${version}`,
  features: { f: version },
  changelog: null,
  createdAt: d("2024-01-0" + version),
});
const U = "00000000-0000-4000-8000-000000000009";

beforeEach(() => getDb.mockReset());

describe("listStyles", () => {
  it("empty", async () => expect(await listStyles(fakeDb([[]]).db, "u")).toEqual([]));
  it("maps joined rows in order", async () => {
    const out = await listStyles(
      fakeDb([
        [
          { styles: S, style_versions: V(2) },
          { styles: { ...S, id: "s2" }, style_versions: V(1) },
        ],
      ]).db,
      "u",
    );
    expect(out.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(out[0]).toMatchObject({ prompt: "p2", currentVersion: 2, createdAt: "2024-01-01T00:00:00.000Z" });
    expect(out[0]).not.toHaveProperty("versions");
  });
});

describe("getStyle", () => {
  it("null when missing", async () => expect(await getStyle(fakeDb([[]]).db, "u", "s1")).toBeNull());
  it("current version prompt + all versions", async () => {
    const s = await getStyle(fakeDb([[S], [V(2), V(1)]]).db, "u", "s1");
    expect(s?.prompt).toBe("p2");
    expect(s?.versions?.map((v) => v.version)).toEqual([2, 1]);
  });
  it("falls back to first version if current missing; null if no versions", async () => {
    expect((await getStyle(fakeDb([[{ ...S, currentVersion: 9 }], [V(3)]]).db, "u", "s1"))?.prompt).toBe("p3");
    expect(await getStyle(fakeDb([[S], []]).db, "u", "s1")).toBeNull();
  });
});

describe("createStyle", () => {
  const req = { id: "s1", name: "N", prompt: "p", features: {} } as never;
  it("inserts version 1 for a new style", async () => {
    const { db, calls } = fakeDb([undefined, [S], undefined, [{ ...S, currentVersion: 1 }], [V(1)]]);
    expect((await createStyle(db, "u", req)).id).toBe("s1");
    expect(calls.filter((c) => c === "insert")).toHaveLength(3);
  });
  it("same id is a no-op (no version insert)", async () => {
    const { db, calls } = fakeDb([undefined, [], [S], [V(2)]]);
    await createStyle(db, "u", req);
    expect(calls.filter((c) => c === "insert")).toHaveLength(2);
  });
});

describe("deleteStyle", () => {
  it("true when deleted", async () => expect(await deleteStyle(fakeDb([[{ id: "s1" }]]).db, "u", "s1")).toBe(true));
  it("false when absent", async () => expect(await deleteStyle(fakeDb([[]]).db, "u", "s1")).toBe(false));
});

describe("addVersion", () => {
  it("appends max+1 and moves current", async () => {
    const { db, calls } = fakeDb([[S], [{ top: 5 }], [V(2)], undefined, undefined, [{ ...S, currentVersion: 6 }], [V(6)]]);
    const out = await addVersion(db, "u", "s1", { prompt: "new", changelog: ["c"] });
    expect(out?.currentVersion).toBe(6);
    expect(calls).toContain("update");
  });
  it("null when style not owned", async () =>
    expect(await addVersion(fakeDb([[]]).db, "u", "s1", { prompt: "x", changelog: [] })).toBeNull());
  it("handles empty history (top undefined)", async () => {
    const { db } = fakeDb([[S], [{}], [], undefined, undefined, [S], [V(2)]]);
    expect(await addVersion(db, "u", "s1", { prompt: "x", changelog: [] })).not.toBeNull();
  });
});

describe("rollbackStyle", () => {
  it("null when version missing", async () => expect(await rollbackStyle(fakeDb([[]]).db, "u", "s1", 9)).toBeNull());
  it("switches current version", async () => {
    const { db, calls } = fakeDb([[{ id: "s1" }], undefined, [{ ...S, currentVersion: 1 }], [V(2), V(1)]]);
    const out = await rollbackStyle(db, "u", "s1", 1);
    expect(calls).toContain("update");
    expect(out?.prompt).toBe("p1");
  });
});

describe("styleRoute", () => {
  const ctx = { params: Promise.resolve({ id: "s1" }) };
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    new Request("http://x", { method: "POST", body: JSON.stringify(body), headers });

  it("503 NO_DB", async () => {
    getDb.mockReturnValue(null);
    const r = await styleRoute(null, async () => ({}))(post({}), ctx);
    expect(r.status).toBe(503);
    expect((await r.json()).code).toBe("NO_DB");
  });
  it("400 on bad x-user-id", async () => {
    getDb.mockReturnValue({});
    expect((await styleRoute(null, async () => ({}))(post({}, { "x-user-id": "nope" }), ctx)).status).toBe(400);
  });
  it("400 on zod failure", async () => {
    getDb.mockReturnValue({});
    const fn = vi.fn();
    expect((await styleRoute(z.object({ a: z.string() }), fn)(post({ a: 1 }), ctx)).status).toBe(400);
    expect(fn).not.toHaveBeenCalled();
  });
  it("404 when handler returns null", async () => {
    getDb.mockReturnValue({});
    expect((await styleRoute(null, async () => null)(post({}), ctx)).status).toBe(404);
  });
  it("200 passes db/userId/id/body", async () => {
    getDb.mockReturnValue({});
    const fn = vi.fn(async (c: { userId: string; id: string; body: { a: string } }) => ({ ok: c.body.a + c.id + c.userId }));
    const r = await styleRoute(z.object({ a: z.string() }), fn)(post({ a: "x" }, { "x-user-id": U }), ctx);
    expect(await r.json()).toEqual({ ok: "xs1" + U });
  });
  it("503 DB_UNAVAILABLE on throw; thrown Response passes through", async () => {
    getDb.mockReturnValue({});
    const r = await styleRoute(null, async () => {
      throw new Error("boom");
    })(post({}), ctx);
    expect(r.status).toBe(503);
    expect((await r.json()).code).toBe("DB_UNAVAILABLE");
    const r2 = await styleRoute(null, async () => {
      throw new Response("t", { status: 418 });
    })(post({}), ctx);
    expect(r2.status).toBe(418);
  });
});
