import { describe, expect, it } from "vitest";
import { DEMO_TEXTS, extractTaboos, jaccard, judgeStyle, SIGNAL_LABELS, synthesizeText, tabooCompliance, WEIGHTS } from "./style-judge";

const style = {
  prompt: "短句。不要感叹号。",
  features: { avgSentenceLength: 10, vocabulary: ["结论", "取舍"], rhythm: "short", devices: [], taboos: ["感叹号", "营销话术"] },
};
const refs = [
  "结论先行。本质是取舍。实现成本很低。边界要写清楚。这是结论。",
  "取舍决定成本。结论很简单。实现可以很短。边界先说明。这是取舍。",
];
const near = "结论先说。本质是取舍。实现成本不高。边界要说清楚。这是结论。";
const far =
  "Yesterday afternoon I wandered through the old harbour market, where fishermen argued loudly about prices while gulls circled overhead waiting for scraps, and I bought a paper bag of warm chestnuts that I ate slowly on the stone pier as the sun dropped behind the lighthouse, which is where the story really begins!";

describe("style judge", () => {
  it("scores a near-identical style above 80", () => {
    const r = judgeStyle({ style, sampleText: near, referenceTexts: refs });
    console.log("near", r);
    expect(r.score).toBeGreaterThan(80);
  });
  it("scores an unrelated style below 30", () => {
    const r = judgeStyle({ style, sampleText: far, referenceTexts: refs });
    console.log("far", r);
    expect(r.score).toBeLessThan(30);
  });
  it("computes jaccard overlap", () => {
    expect(jaccard(new Set(["a", "b", "c"]), new Set(["b", "c", "d"]))).toBeCloseTo(0.5);
    expect(jaccard(new Set(), new Set())).toBe(0);
    const r = judgeStyle({ style, sampleText: refs[0]!, referenceTexts: [refs[0]!] });
    expect(r.signals.vocabularyOverlap).toBe(1);
  });
  it("penalises taboo violations proportionally", () => {
    expect(tabooCompliance("没问题。", ["感叹号", "营销话术"])).toBe(1);
    expect(tabooCompliance("太棒了!", ["感叹号", "营销话术"])).toBe(0.5);
    expect(tabooCompliance("太棒了!营销话术", ["感叹号", "营销话术"])).toBe(0);
    const clean = judgeStyle({ style, sampleText: near, referenceTexts: refs });
    const dirty = judgeStyle({ style, sampleText: near + "太棒了!", referenceTexts: refs });
    expect(dirty.signals.tabooCompliance).toBe(0.5);
    expect(dirty.score).toBeLessThan(clean.score);
  });
  it("extracts taboos from the prompt too", () => {
    expect(extractTaboos({ prompt: "不要感叹号,避免空话。", features: undefined })).toEqual(["感叹号", "空话"]);
  });
  it("score equals the weighted average of signals", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const r = judgeStyle({ style, sampleText: DEMO_TEXTS[1]!.text, referenceTexts: refs });
    const sum = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).reduce((s, k) => s + WEIGHTS[k] * r.signals[k], 0);
    expect(r.score).toBe(Math.round(sum * 100));
    for (const v of Object.values(r.signals)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  it("feedback names the weakest signal", () => {
    const r = judgeStyle({ style, sampleText: near + "太棒了!营销话术", referenceTexts: refs });
    const worst = Object.entries(r.signals).sort((a, b) => a[1] - b[1])[0]![0] as keyof typeof SIGNAL_LABELS;
    expect(r.feedback).toContain(`「${SIGNAL_LABELS[worst]}」`);
  });
  it("synthesizeText is deterministic and usable as a reference", () => {
    expect(synthesizeText(style)).toBe(synthesizeText(style));
    expect(judgeStyle({ style, sampleText: synthesizeText(style), referenceTexts: [synthesizeText(style)] }).score).toBe(100);
  });
});

describe("style judge: degenerate inputs", () => {
  const bare = { prompt: "写得短一点", features: undefined };
  it("empty sample / no references / no taboos zero the dependent signals without throwing", () => {
    const r = judgeStyle({ style: bare, sampleText: "", referenceTexts: [] });
    expect(r.signals).toMatchObject({ sentenceLength: 0, sentenceCountMatch: 0, tabooCompliance: 1 });
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
  it("references given but empty sample → count match 0", () => {
    expect(judgeStyle({ style: bare, sampleText: "", referenceTexts: refs }).signals.sentenceCountMatch).toBe(0);
  });
  it("tabooCompliance([]) is 1", () => expect(tabooCompliance("任何!文字", [])).toBe(1));
});

describe("synthesizeText: feature-less and rhythm variants", () => {
  const f = (rhythm: string) => ({ avgSentenceLength: 12, vocabulary: ["结论"], rhythm, devices: [], taboos: [] });
  it("falls back to prompt tokens and default length without features", () => {
    const t = synthesizeText({ prompt: "结论先行 取舍", features: undefined });
    expect(t.endsWith("。")).toBe(true);
    expect(t.split("。").filter(Boolean)).toHaveLength(6);
  });
  it("uses the prompt when features.vocabulary is empty", () => {
    expect(synthesizeText({ prompt: "alpha beta", features: { ...f("x"), vocabulary: [] } })).toMatch(/alpha|beta/);
  });
  it("short-short-long vs long rhythms vary sentence length; others are uniform", () => {
    const lens = (r: string) =>
      synthesizeText({ prompt: "p", features: f(r) }, 3)
        .split("。")
        .filter(Boolean)
        .map((s) => s.length);
    const [a, b, c] = lens("short-short-long");
    expect(c!).toBeGreaterThan(a!);
    expect(a).toBe(b);
    const [l1, , l3] = lens("long");
    expect(l1!).toBeGreaterThan(l3!);
    expect(new Set(lens("flat")).size).toBe(1);
  });
});
