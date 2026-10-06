import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const postMock = vi.fn();
vi.mock("./http", () => ({ post: (...a: unknown[]) => postMock(...a) }));

import { deleteStyle, migrate, history, refine, rollback, saveStyle, setMode, syncNow, useStylesDb } from "./styles-sync";
import { replaceStyles } from "./styles-store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const st = (id: string, extra = {}) => ({ id, name: id, prompt: `p-${id}`, version: 1, ...extra });
const api = (id: string, extra = {}) => ({
  id,
  name: id,
  currentVersion: 3,
  prompt: `cloud-${id}`,
  features: undefined,
  createdAt: "2024-01-01",
  ...extra,
});
const local = () => JSON.parse(localStorage.getItem("mediaforge.styles")!).styles.map((s: { id: string }) => s.id);

let routes: Record<string, (init: RequestInit) => { status?: number; body?: unknown } | Error>;
const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
  const r = routes[`${init.method ?? "GET"} ${url}`]?.(init) ?? { body: {} };
  if (r instanceof Error) throw r;
  return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200 });
});

beforeEach(async () => {
  localStorage.clear();
  fetchMock.mockClear();
  postMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  routes = {};
  await setMode("local"); // resets module state
  replaceStyles([]);
});

const goDb = async (remote: unknown[]) => {
  routes["GET /api/styles"] = () => ({ body: remote });
  await setMode("db");
};

describe("mode + syncNow", () => {
  it("setMode('local') does no fetch", async () => {
    await setMode("local");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("mediaforge.styles.mode")).toBe("local");
  });
  it("setMode('db') syncs; remote replaces, local-only styles are kept", async () => {
    replaceStyles([st("local-only") as never, st("s1") as never]);
    await goDb([api("s1"), api("s2")]);
    expect(local().sort()).toEqual(["local-only", "s1", "s2"]);
    expect(JSON.parse(localStorage.getItem("mediaforge.styles")!).styles.find((s: { id: string }) => s.id === "s1").prompt).toBe(
      "cloud-s1",
    );
  });
  it("5xx degrades to local with warning, keeps local data", async () => {
    replaceStyles([st("a") as never]);
    routes["GET /api/styles"] = () => ({ status: 503, body: { error: "no db" } });
    await setMode("db");
    expect(localStorage.getItem("mediaforge.styles.mode")).toBe("local");
    expect(local()).toEqual(["a"]);
  });
  it("network failure degrades", async () => {
    routes["GET /api/styles"] = () => new Error("offline");
    await setMode("db");
    expect(localStorage.getItem("mediaforge.styles.mode")).toBe("local");
  });
  it("4xx is rethrown, not degraded", async () => {
    routes["GET /api/styles"] = () => ({ status: 400, body: { error: "bad" } });
    await expect(setMode("db")).rejects.toThrow("bad");
  });
});

describe("writes", () => {
  it("saveStyle in local mode: local only", async () => {
    await saveStyle(st("a") as never);
    expect(local()).toEqual(["a"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("saveStyle in db mode uploads once", async () => {
    await goDb([]);
    routes["POST /api/styles"] = () => ({ body: api("n") });
    await saveStyle(st("n") as never);
    await saveStyle(st("n") as never); // now in cloud -> no second upload
    expect(local()).toEqual(["n"]);
    expect(fetchMock.mock.calls.filter(([, i]) => i?.method === "POST")).toHaveLength(1);
    expect(fetchMock.mock.calls.at(-1)?.[1]?.headers).toHaveProperty("x-user-id");
  });
  it("deleteStyle removes locally and DELETEs cloud copies only", async () => {
    await goDb([api("c")]);
    replaceStyles([st("c") as never, st("l") as never]);
    await deleteStyle("l");
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(false);
    await deleteStyle("c");
    expect(fetchMock.mock.calls.some(([u, i]) => u === "/api/styles/c" && i?.method === "DELETE")).toBe(true);
    expect(local()).toEqual([]);
  });
});

describe("migrate", () => {
  it("uploads local-only styles then re-syncs", async () => {
    await goDb([api("c")]);
    replaceStyles([st("c") as never, st("l") as never]);
    routes["POST /api/styles"] = () => ({ body: api("l") });
    await migrate();
    const posts = fetchMock.mock.calls.filter(([, i]) => i?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0]![1]!.body as string).id).toBe("l");
  });
  it("cloud outage during upload degrades to local", async () => {
    await goDb([]);
    replaceStyles([st("l") as never]);
    routes["POST /api/styles"] = () => ({ status: 503, body: { error: "down" } });
    await migrate();
    expect(localStorage.getItem("mediaforge.styles.mode")).toBe("local");
    expect(local()).toEqual(["l"]);
  });
});

describe("refine / rollback / history", () => {
  it("refine local path uses /api/style/refine and keeps features", async () => {
    const s = st("a", { features: { f: 1 } }) as never;
    postMock.mockResolvedValue({ style: { ...st("a"), prompt: "new" }, changelog: ["x"] });
    expect(await refine(s, "fb")).toEqual(["x"]);
    expect(postMock).toHaveBeenCalledWith("/api/style/refine", { style: s, feedback: "fb" });
    const saved = JSON.parse(localStorage.getItem("mediaforge.styles")!).styles[0];
    expect(saved).toMatchObject({ prompt: "new", features: { f: 1 } });
  });
  it("refine cloud path uses versioned endpoint", async () => {
    await goDb([api("c")]);
    routes["POST /api/styles/c/refine"] = () => ({ body: { style: api("c", { prompt: "refined" }), changelog: ["y"] } });
    expect(await refine(st("c") as never, "fb")).toEqual(["y"]);
    expect(postMock).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("mediaforge.styles")!).styles.find((s: { id: string }) => s.id === "c").prompt).toBe("refined");
  });
  it("refine cloud failure falls back to local endpoint", async () => {
    await goDb([api("c")]);
    routes["POST /api/styles/c/refine"] = () => ({ status: 500, body: { error: "x" } });
    postMock.mockResolvedValue({ style: st("c"), changelog: ["z"] });
    expect(await refine(st("c") as never, "fb")).toEqual(["z"]);
  });
  it("rollback calls cloud and returns versions", async () => {
    routes["POST /api/styles/c/rollback"] = (i) => ({ body: api("c", { versions: [{ version: 1 }], _b: i.body }) });
    expect(await rollback("c", 1)).toEqual([{ version: 1 }]);
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe('{"version":1}');
    expect(local()).toEqual(["c"]);
  });
  it("history: undefined when not in cloud, versions when in cloud", async () => {
    expect(await history("c")).toBeUndefined();
    await goDb([api("c")]);
    routes["GET /api/styles/c"] = () => ({ body: api("c", { versions: [{ version: 2 }] }) });
    expect(await history("c")).toEqual([{ version: 2 }]);
  });
});

describe("useStylesDb", () => {
  async function render() {
    let out!: ReturnType<typeof useStylesDb>;
    const C = () => ((out = useStylesDb()), null);
    const root = createRoot(document.createElement("div"));
    await act(async () => root.render(createElement(C)));
    return { get: () => out, unmount: () => act(async () => root.unmount()) };
  }
  it("pending = local styles not in cloud (db mode only)", async () => {
    const h = await render();
    expect(h.get().pending).toEqual([]);
    await act(async () => {
      replaceStyles([st("c") as never, st("l") as never]);
      await goDb([api("c")]);
    });
    expect(h.get().mode).toBe("db");
    expect(h.get().pending.map((s) => s.id)).toEqual(["l"]);
    expect(h.get().inCloud("c")).toBe(true);
    expect(h.get().inCloud("l")).toBe(false);
    await act(async () => h.get().dismissMigration());
    expect(h.get().migrationDismissed).toBe(true);
    await h.unmount();
  });
  it("syncNow sets busy false and warning dismissable", async () => {
    const h = await render();
    routes["GET /api/styles"] = () => ({ status: 503, body: { error: "e" } });
    await act(async () => syncNow());
    expect(h.get().warning).toContain("回退");
    await act(async () => h.get().dismissWarning());
    expect(h.get().warning).toBe("");
    expect(h.get().busy).toBe(false);
    await h.unmount();
  });
});
