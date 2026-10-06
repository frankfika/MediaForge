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
