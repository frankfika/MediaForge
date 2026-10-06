import { z } from "zod";

/** Route Handler wrapper: validate JSON body, return JSON or pass through a Response, map errors to {error}. */
export const route =
  <S extends z.ZodTypeAny>(schema: S, handler: (body: z.infer<S>) => Promise<unknown>) =>
  async (req: Request): Promise<Response> => {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
    try {
      const out = await handler(parsed.data);
      return out instanceof Response ? out : Response.json(out);
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
    }
  };

/** Client-side typed POST. */
export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? res.statusText);
  return json;
}
