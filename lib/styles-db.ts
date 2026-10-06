/**
 * Server-side style persistence (Drizzle/Postgres) + the Route Handler wrapper for /api/styles.
 * Auth is mocked: the `x-user-id` header (a uuid) names the user; swap for Clerk's userId later.
 */
import { and, desc, eq, max } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db/client";
import { styles, styleVersions, users } from "./db/schema";
import type { ApiStyle, CreateStyleRequest, StyleVersion } from "./types";

type Db = NonNullable<ReturnType<typeof getDb>>;
const DEFAULT_USER = "00000000-0000-4000-8000-000000000001";

const toVersion = (v: typeof styleVersions.$inferSelect): StyleVersion => ({
  version: v.version,
  prompt: v.prompt,
  features: v.features as StyleVersion["features"],
  changelog: v.changelog,
  createdAt: v.createdAt.toISOString(),
});

const toStyle = (s: typeof styles.$inferSelect, cur: typeof styleVersions.$inferSelect, versions?: StyleVersion[]): ApiStyle => ({
  id: s.id,
  name: s.name,
  currentVersion: s.currentVersion,
  prompt: cur.prompt,
  features: cur.features as ApiStyle["features"],
  createdAt: s.createdAt.toISOString(),
  ...(versions && { versions }),
});

const owned = (userId: string, id: string) => and(eq(styles.id, id), eq(styles.userId, userId));

export async function listStyles(db: Db, userId: string): Promise<ApiStyle[]> {
  const rows = await db
    .select()
    .from(styles)
    .innerJoin(styleVersions, and(eq(styleVersions.styleId, styles.id), eq(styleVersions.version, styles.currentVersion)))
    .where(eq(styles.userId, userId))
    .orderBy(styles.createdAt);
  return rows.map((r) => toStyle(r.styles, r.style_versions));
}

export async function getStyle(db: Db, userId: string, id: string): Promise<ApiStyle | null> {
  const [s] = await db.select().from(styles).where(owned(userId, id));
  if (!s) return null;
  const vs = await db.select().from(styleVersions).where(eq(styleVersions.styleId, id)).orderBy(desc(styleVersions.version));
  const cur = vs.find((v) => v.version === s.currentVersion) ?? vs[0];
  return cur ? toStyle(s, cur, vs.map(toVersion)) : null;
}

export async function createStyle(db: Db, userId: string, req: CreateStyleRequest): Promise<ApiStyle> {
  const id = await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({ id: userId, email: `${userId}@mock.local` })
      .onConflictDoNothing();
    const [s] = await tx
      .insert(styles)
      .values({ ...(req.id && { id: req.id }), userId, name: req.name })
      .onConflictDoNothing()
      .returning();
    // Same id uploaded twice (retry / second device) is a no-op, not a duplicate.
    if (s) await tx.insert(styleVersions).values({ styleId: s.id, version: 1, prompt: req.prompt, features: req.features });
    return s?.id ?? req.id!;
  });
  return (await getStyle(db, userId, id))!;
}

export async function deleteStyle(db: Db, userId: string, id: string) {
  const gone = await db.delete(styles).where(owned(userId, id)).returning({ id: styles.id });
  return gone.length > 0;
}

/** Append-only: always max(version)+1, even after a rollback, so history is never overwritten. */
export async function addVersion(db: Db, userId: string, id: string, v: { prompt: string; changelog: string[] }): Promise<ApiStyle | null> {
  const ok = await db.transaction(async (tx) => {
    const [s] = await tx.select().from(styles).where(owned(userId, id));
    if (!s) return false;
    const [row] = await tx
      .select({ top: max(styleVersions.version) })
      .from(styleVersions)
      .where(eq(styleVersions.styleId, id));
    const top = row?.top;
    const [prev] = await tx
      .select()
      .from(styleVersions)
      .where(and(eq(styleVersions.styleId, id), eq(styleVersions.version, s.currentVersion)));
    const version = (top ?? 0) + 1;
    await tx.insert(styleVersions).values({ styleId: id, version, prompt: v.prompt, features: prev?.features, changelog: v.changelog });
    await tx.update(styles).set({ currentVersion: version }).where(eq(styles.id, id));
    return true;
  });
  return ok ? getStyle(db, userId, id) : null;
}

export async function rollbackStyle(db: Db, userId: string, id: string, version: number): Promise<ApiStyle | null> {
  const [hit] = await db
    .select({ id: styles.id })
    .from(styles)
    .innerJoin(styleVersions, eq(styleVersions.styleId, styles.id))
    .where(and(owned(userId, id), eq(styleVersions.version, version)));
  if (!hit) return null;
  await db.update(styles).set({ currentVersion: version }).where(eq(styles.id, id));
  return getStyle(db, userId, id);
}

/**
 * 503 {code:"NO_DB"} without DATABASE_URL, 503 {code:"DB_UNAVAILABLE"} on connection/query failure,
 * 404 when the handler returns null. The client treats 5xx as "degrade to localStorage".
 */
export const styleRoute =
  <S extends z.ZodTypeAny = z.ZodUndefined>(
    schema: S | null,
    fn: (c: { db: Db; userId: string; id: string; body: z.infer<S> }) => Promise<unknown>,
  ) =>
  async (req: Request, ctx: { params: Promise<{ id?: string }> }): Promise<Response> => {
    const db = getDb();
    if (!db) return Response.json({ error: "DATABASE_URL is not set", code: "NO_DB" }, { status: 503 });
    const raw = req.headers.get("x-user-id") ?? DEFAULT_USER;
    if (!z.string().uuid().safeParse(raw).success) return Response.json({ error: "x-user-id must be a uuid" }, { status: 400 });
    let body: unknown;
    if (schema) {
      const parsed = schema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
      body = parsed.data;
    }
    try {
      const out = await fn({ db, userId: raw, id: (await ctx.params).id ?? "", body: body as z.infer<S> });
      return out === null ? Response.json({ error: "Not found" }, { status: 404 }) : Response.json(out);
    } catch (e) {
      if (e instanceof Response) return e;
      return Response.json({ error: e instanceof Error ? e.message : "Database error", code: "DB_UNAVAILABLE" }, { status: 503 });
    }
  };
