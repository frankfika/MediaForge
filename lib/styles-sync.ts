"use client";
/**
 * Optional Postgres sync on top of the localStorage store.
 * localStorage is always the render source and offline cache; in 'db' mode the server (/api/styles) is the
 * source of truth and every write is mirrored there. Any server failure (5xx / network / no DATABASE_URL)
 * flips the mode back to 'local' and raises `warning` — nothing is ever lost locally.
 */
import { useStyles as useLocalStyles, removeStyle, replaceStyles, upsertStyle } from "./styles-store";
import { post } from "./http";
import { apiToStyle, type ApiStyle, type Style, type StyleVersion } from "./types";
import { useSyncExternalStore } from "react";

export type Mode = "local" | "db";
type Sync = { mode: Mode; warning: string; remoteIds: string[] | null; busy: boolean; migrationDismissed: boolean };

const MODE_KEY = "mediaforge.styles.mode";
const USER_KEY = "mediaforge.userId";
const SERVER: Sync = { mode: "local", warning: "", remoteIds: null, busy: false, migrationDismissed: false };
let state: Sync = typeof window === "undefined" ? SERVER : { ...SERVER, mode: localStorage.getItem(MODE_KEY) === "db" ? "db" : "local" };
const listeners = new Set<() => void>();
const set = (patch: Partial<Sync>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));

class DbError extends Error {}
const userId = () => localStorage.getItem(USER_KEY) ?? (localStorage.setItem(USER_KEY, crypto.randomUUID()), localStorage.getItem(USER_KEY)!);

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/styles${path}`, {
      ...init,
      headers: { "x-user-id": userId(), ...(init.body && { "content-type": "application/json" }) },
    });
  } catch {
    throw new DbError("网络不可用");
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status >= 500) throw new DbError(json.error ?? res.statusText);
  if (!res.ok) throw new Error(json.error ?? res.statusText);
  return json;
}
const send = <T>(path: string, body: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(body) });

const degrade = (e: DbError) => {
  localStorage.setItem(MODE_KEY, "local");
  set({ mode: "local", remoteIds: null, busy: false, warning: `云端同步不可用,已回退到本地存储:${e.message}` });
};
/** Run a cloud op; on infrastructure failure degrade to local and return undefined. */
async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DbError) return void degrade(e);
    throw e;
  }
}
const inCloud = (id: string) => state.mode === "db" && !!state.remoteIds?.includes(id);
const localStyles = (): Style[] => JSON.parse(localStorage.getItem("mediaforge.styles") ?? '{"styles":[]}').styles;

export async function syncNow() {
  set({ busy: true, warning: "" });
  await guard(async () => {
    const remote = (await api<ApiStyle[]>("")).map(apiToStyle);
    const ids = new Set(remote.map((s) => s.id));
    replaceStyles([...remote, ...localStyles().filter((s) => !ids.has(s.id))]); // local-only styles stay until migrated
    set({ remoteIds: [...ids], busy: false });
  });
  set({ busy: false });
}

export async function setMode(mode: Mode) {
  localStorage.setItem(MODE_KEY, mode);
  set({ mode, warning: "", remoteIds: null, migrationDismissed: false });
  if (mode === "db") await syncNow();
}

const upload = (s: Style) => send<ApiStyle>("", { id: s.id, name: s.name, prompt: s.prompt, features: s.features });

/** Upload every local-only style, then re-sync. */
export async function migrate() {
  set({ busy: true });
  const todo = localStyles().filter((s) => !state.remoteIds?.includes(s.id));
  const done = await guard(() => Promise.all(todo.map(upload)));
  if (done) await syncNow();
  set({ busy: false });
}

/** Save a freshly learned/edited style locally, and to the cloud when connected. */
export async function saveStyle(s: Style) {
  upsertStyle(s);
  if (state.mode === "db" && state.remoteIds && !inCloud(s.id))
    await guard(async () => {
      await upload(s);
      set({ remoteIds: [...(state.remoteIds ?? []), s.id] });
    });
}

export async function deleteStyle(id: string) {
  const cloud = inCloud(id);
  removeStyle(id);
  if (cloud) await guard(() => api(`/${id}`, { method: "DELETE" }));
}

/** Refine from feedback: through the versioned cloud endpoint when the style lives there, else the stateless one. */
export async function refine(style: Style, feedback: string): Promise<string[]> {
  if (inCloud(style.id)) {
    const r = await guard(() => send<{ style: ApiStyle; changelog: string[] }>(`/${style.id}/refine`, { feedback }));
    if (r) return (upsertStyle(apiToStyle(r.style)), r.changelog);
  }
  const r = await post<{ style: Style; changelog: string[] }>("/api/style/refine", { style, feedback });
  upsertStyle({ ...r.style, features: style.features });
  return r.changelog;
}

export const history = async (id: string): Promise<StyleVersion[] | undefined> =>
  inCloud(id) ? (await guard(() => api<ApiStyle>(`/${id}`)))?.versions : undefined;

export async function rollback(id: string, version: number) {
  const s = await guard(() => send<ApiStyle>(`/${id}/rollback`, { version }));
  if (s) upsertStyle(apiToStyle(s));
  return s?.versions;
}

export function useStylesDb() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER);
  const { styles } = useLocalStyles();
  const pending = s.mode === "db" && s.remoteIds ? styles.filter((x) => !s.remoteIds!.includes(x.id)) : [];
  return {
    ...s,
    pending,
    inCloud: (id: string) => s.mode === "db" && !!s.remoteIds?.includes(id),
    dismissWarning: () => set({ warning: "" }),
    dismissMigration: () => set({ migrationDismissed: true }),
  };
}
