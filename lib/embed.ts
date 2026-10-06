export const EMBED_DIM = 64;

/** FNV-1a 32-bit. */
const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

/** Deterministic mock embeddings: text hash seeds a mulberry32 stream -> 64 floats in [-1, 1). */
// ponytail: not semantic (similar texts are NOT close); swap for a real embedding provider when one is wired in.
export function generateEmbeddings(texts: string[]): number[][] {
  return texts.map((t) => {
    let a = hash(t);
    return Array.from({ length: EMBED_DIM }, () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return (((x ^ (x >>> 14)) >>> 0) / 2 ** 32) * 2 - 1;
    });
  });
}

/** Cosine similarity; 0 if either vector has zero length. */
export function cosineSim(a: number[], b: number[]): number {
  const dot = a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
  const n = Math.hypot(...a) * Math.hypot(...b);
  return n ? dot / n : 0;
}

/**
 * OpenAI provider interface. Returns the same `{embeddings: number[][]}` shape
 * `generateEmbeddings` returns. Switches on env so users don't have to wire
 * anything at the call site; `route()` callers always go through `routeEmbeddings`.
 *
 * ponytail: out of the box, both `OPENAI_API_KEY` and `OPENAI_EMBEDDING_MODEL`
 * are unset, so `callOpenAIProvider` returns null and `routeEmbeddings` falls
 * back to the mock. Set the two envs and the next `/api/embed` call goes
 * through OpenAI. Anthropic has no embeddings API and is not in scope here.
 */
export type OpenAIProvider = (texts: string[]) => Promise<number[][]>;

export function getOpenAIProvider(modelName = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small"): OpenAIProvider | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return async (texts: string[]): Promise<number[][]> => {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ input: texts, model: modelName }),
    });
    if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}`);
    const { data } = (await res.json()) as { data: { embedding: number[] }[] };
    return data.map((d) => d.embedding);
  };
}

/**
 * Try the configured provider; if it fails or none is configured, return
 * the deterministic mock vectors. Never throws. The provider's output
 * keeps its native dimension (e.g. 1536 for text-embedding-3-small),
 * but cosineSim still works because it walks whichever indices both vectors
 * share.
 */
export async function generateEmbeddingsAuto(
  texts: string[],
): Promise<{ vectors: number[][]; provider: "openai" | "mock"; model: string; dim?: number }> {
  const p = getOpenAIProvider();
  if (p) {
    try {
      const vecs = await p(texts);
      return {
        vectors: vecs,
        provider: "openai",
        model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
        dim: vecs[0]?.length,
      };
    } catch {
      // fall through to mock on any upstream failure
    }
  }
  const vecs = generateEmbeddings(texts);
  return { vectors: vecs, provider: "mock", model: "mock-fnv1a", dim: EMBED_DIM };
}
