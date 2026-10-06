/** Deterministic style judge: no LLM. Scores a text against reference samples + the style's taboos. Relative imports only. */
import type { Style } from "./types";

export type Signals = {
  sentenceLength: number;
  vocabularyOverlap: number;
  rhythmMatch: number;
  sentenceCountMatch: number;
  tabooCompliance: number;
};
export type JudgeResult = { score: number; signals: Signals; feedback: string };

export const WEIGHTS: Signals = {
  sentenceLength: 0.25,
  vocabularyOverlap: 0.25,
  rhythmMatch: 0.2,
  sentenceCountMatch: 0.1,
  tabooCompliance: 0.2,
};
export const SIGNAL_LABELS: Record<keyof Signals, string> = {
  sentenceLength: "句长分布",
  vocabularyOverlap: "词汇重叠",
  rhythmMatch: "节奏",
  sentenceCountMatch: "句数",
  tabooCompliance: "禁忌遵守",
};

const TOP_N = 20;
const BUCKETS = [5, 10, 20, 35, 60]; // upper bounds; one extra open bucket
// Known taboo names that map to a literal check; anything else is matched as a literal substring.
const TABOO_LITERALS: Record<string, string[]> = { 感叹号: ["!", "!"], 问号: ["?", "?"], 省略号: ["…", "..."] };

const sentences = (t: string) =>
  t
    .split(/[。!?!?;;.\n]+/)
    .map((s) => s.replace(/\s/g, ""))
    .filter(Boolean);
const bucket = (n: number) => {
  const i = BUCKETS.findIndex((b) => n <= b);
  return i < 0 ? BUCKETS.length : i;
};
const histogram = (ss: string[]) => {
  const h = new Array<number>(BUCKETS.length + 1).fill(0);
  for (const s of ss) {
    const b = bucket(s.length);
    h[b] = (h[b] ?? 0) + 1;
  }
  return h;
};
const symbol = (s: string) => (s.length <= 12 ? "S" : s.length <= 25 ? "M" : "L");

function cosine(a: Map<string, number> | number[], b: Map<string, number> | number[]): number {
  const m = (x: Map<string, number> | number[]) => (x instanceof Map ? x : new Map(x.map((v, i) => [String(i), v])));
  const [x, y] = [m(a), m(b)];
  let dot = 0,
    nx = 0,
    ny = 0;
  for (const [k, v] of x) {
    dot += v * (y.get(k) ?? 0);
    nx += v * v;
  }
  for (const v of y.values()) ny += v * v;
  return nx && ny ? dot / Math.sqrt(nx * ny) : 0;
}

/** Overlapping rhythm trigrams of the S/M/L pattern ("SSL", ...). Patterns shorter than 3 are one gram. */
function rhythmGrams(ss: string[]): Map<string, number> {
  const p = ss.map(symbol).join("");
  const g = new Map<string, number>();
  for (let i = 0; i < Math.max(1, p.length - 2); i++) g.set(p.slice(i, i + 3), (g.get(p.slice(i, i + 3)) ?? 0) + 1);
  return g;
}

/** Latin words + CJK character bigrams (no segmenter needed). */
function tokens(t: string): string[] {
  const out: string[] = t.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const run of t.match(/[一-鿿]+/g) ?? []) for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2));
  return out;
}
const topN = (t: string, n = TOP_N) => {
  const c = new Map<string, number>();
  for (const w of tokens(t)) c.set(w, (c.get(w) ?? 0) + 1);
  return new Set(
    [...c]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, n)
      .map(([w]) => w),
  );
};
export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

/** Taboos from structured features plus "不要/避免/禁止/never/avoid X" clauses in the prompt. */
export function extractTaboos(style: Pick<Style, "prompt" | "features">): string[] {
  const fromPrompt = [...style.prompt.matchAll(/(?:不要|避免|禁止|不用|never|avoid)\s*([^,,。.;;\n]+)/gi)].map((m) => (m[1] ?? "").trim());
  return [...new Set([...(style.features?.taboos ?? []), ...fromPrompt])].filter(Boolean);
}

/** Fraction of checkable taboos that the text does NOT violate. Taboos that can't be checked literally count as complied. */
export function tabooCompliance(text: string, taboos: string[]): number {
  if (!taboos.length) return 1;
  const hit = taboos.filter((t) => (TABOO_LITERALS[t] ?? [t]).some((l) => text.includes(l))).length;
  return 1 - hit / taboos.length;
}

export function judgeStyle(input: {
  style: Pick<Style, "prompt" | "features">;
  sampleText: string;
  referenceTexts: string[];
}): JudgeResult {
  const { style, sampleText } = input;
  const refs = input.referenceTexts.filter((r) => r.trim());
  const refText = refs.join("\n");
  const sS = sentences(sampleText),
    rS = sentences(refText);

  const expected = refs.length ? rS.length / refs.length : 0;
  const signals: Signals = {
    sentenceLength: cosine(histogram(sS), histogram(rS)),
    vocabularyOverlap: jaccard(topN(sampleText), topN(refText)),
    rhythmMatch: cosine(rhythmGrams(sS), rhythmGrams(rS)),
    sentenceCountMatch: expected && sS.length ? Math.min(sS.length, expected) / Math.max(sS.length, expected) : 0,
    tabooCompliance: tabooCompliance(sampleText, extractTaboos(style)),
  };
  const keys = Object.keys(WEIGHTS) as (keyof Signals)[];
  const score = Math.round(100 * keys.reduce((s, k) => s + WEIGHTS[k] * signals[k], 0));
  const worst = keys.reduce((a, b) => (signals[b] < signals[a] ? b : a));
  return { score, signals, feedback: feedbackFor(worst, signals[worst], score) };
}

const ADVICE: Record<keyof Signals, string> = {
  sentenceLength: "句长分布和参考样本差得最多,按参考样本的长短句比例改写",
  vocabularyOverlap: "高频词几乎不重合,多用参考样本里的标志词",
  rhythmMatch: "长短句的节奏走向不同,调整长短句的排列顺序",
  sentenceCountMatch: "句数和参考样本的篇幅不符,增删句子",
  tabooCompliance: "出现了风格禁忌的内容,删掉它们",
};
const feedbackFor = (k: keyof Signals, v: number, score: number) =>
  `${score >= 80 ? "很像" : score >= 50 ? "有差距" : "不像"}(${score} 分)。最弱项「${SIGNAL_LABELS[k]}」${Math.round(v * 100)}%:${ADVICE[k]}。`;

/** Deterministic stand-in "generation": signature words slotted into sentence templates at the target length. Used as the reference when the user supplies none. */
export function synthesizeText(style: Pick<Style, "prompt" | "features">, sentenceCount = 6): string {
  const f = style.features;
  const words = f?.vocabulary.length ? f.vocabulary : tokens(style.prompt).slice(0, 6);
  const target = Math.max(4, Math.round(f?.avgSentenceLength ?? 15));
  const pattern = /short-short-long/.test(f?.rhythm ?? "") ? [0.5, 0.5, 1.6] : /long/.test(f?.rhythm ?? "") ? [1.4, 1.2, 0.4] : [1];
  return (
    Array.from({ length: sentenceCount }, (_, i) => {
      const len = Math.max(2, Math.round(target * (pattern[i % pattern.length] ?? 1)));
      let s = "";
      for (let j = 0; s.length < len; j++) s += words[(i + j) % words.length] + (j % 2 ? "" : "是");
      return s.slice(0, len);
    }).join("。") + "。"
  );
}

/** Four try-me texts for the styles page. */
export const DEMO_TEXTS: { label: string; text: string }[] = [
  { label: "技术短句", text: "结论先行。本质是取舍。实现成本很低。边界要写清楚。这是结论。我们只做一件事。" },
  { label: "种草口语", text: "姐妹们真的绝了!亲测好用。谁懂啊,必入!用完整个人都不一样了,我已经回购了三次还想继续囤。你们觉得呢?" },
  {
    label: "深度评论",
    text: "事实上,我们习惯把趋势当作结果,却很少追问它背后的悖论。换个角度看,所谓效率的提升,往往只是把成本从看得见的地方挪到了看不见的地方,而更深一层的问题在于,没有人愿意为这笔账负责。归根结底,这是一个选择。",
  },
  { label: "营销腔(违规)", text: "震惊!史上最强产品限时抢购!!全网最低价,错过后悔一辈子!快来点击下单吧!" },
];
