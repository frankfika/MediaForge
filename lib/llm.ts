/**
 * LLM seam for entrypoints that must work without an API key (the MCP server).
 * ANTHROPIC_API_KEY set -> lib/ai (Claude). Otherwise a deterministic, template-based mock:
 * no network, same input -> same output, shapes identical to the real thing.
 * Relative imports only so scripts/mcp-server.ts runs standalone under tsx.
 */
import * as ai from "./ai";
import { PLATFORM_SPECS } from "./platforms";
import type { Platform, RewriteResult, Source, StyleProfile, StyleRef } from "./types";

export const llmMode = (): "anthropic" | "mock" => (process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock");

const sentences = (t: string) => t.split(/(?<=[。！？!?.])\s*|\n+/).map((s) => s.trim()).filter(Boolean);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const HASHTAG_SOURCES = /[\p{Script=Han}]{2,4}|[A-Za-z]{4,}/gu;

/** Greedy: take whole sentences until `limit` chars. */
function take(text: string, limit: number) {
  let out = "";
  for (const s of sentences(text)) {
    if ((out + s).length > limit) break;
    out += (out ? "\n" : "") + s;
  }
  return out || clip(text, limit);
}

function topWords(text: string, n: number) {
  const freq = new Map<string, number>();
  for (const w of text.match(HASHTAG_SOURCES) ?? []) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([w]) => w);
}

export const mock = {
  async rewrite({ source, platforms, instruction }: { source: Source; platforms: Platform[]; instruction?: string }): Promise<RewriteResult> {
    const tags = topWords(source.text, 4);
    const posts = platforms.map((platform) => {
      const { limit } = PLATFORM_SPECS[platform];
      const note = instruction ? `\n\n(${instruction})` : "";
      switch (platform) {
        case "x":
          return { platform, body: take(source.text, limit - 40) + (tags[0] ? ` #${tags[0]}` : "") };
        case "xhs":
          return { platform, title: `✨${clip(source.title, 18)}`, body: `${take(source.text, limit - 80)}${note}\n\n${tags.map((t) => `#${t}`).join(" ")}` };
        case "wechat":
          return { platform, title: clip(source.title, 22), body: `${take(source.text, limit)}${note}\n\n你怎么看?欢迎在评论区聊聊。` };
        case "bilibili":
          return { platform, title: `【${clip(source.title, 24)}】`, body: `${take(source.text, limit)}${note}` };
      }
    });
    return { media: { images: source.images, videos: source.videos }, posts };
  },

  async learnStyle(samples: string[]): Promise<StyleProfile> {
    const all = samples.join("\n");
    const ss = sentences(all);
    const avg = Math.round(all.replace(/\s/g, "").length / Math.max(ss.length, 1));
    const vocabulary = topWords(all, 12);
    const devices = [/[?？]/.test(all) && "rhetorical questions", /^\s*[-*\d]+[.)、]?\s/m.test(all) && "lists", /["“「]/.test(all) && "quotations"].filter((d): d is string => !!d);
    const rhythm = avg < 20 ? "short, punchy sentences" : avg < 40 ? "medium sentences with occasional short ones" : "long, flowing sentences";
    const exemplars = ss.filter((s) => s.length > 6).slice(0, 2);
    return {
      features: { avgSentenceLength: avg, vocabulary, rhythm, devices, taboos: [] },
      prompt: [
        `Write with ${rhythm}; aim for about ${avg} characters per sentence.`,
        vocabulary.length ? `Favor these signature words when natural: ${vocabulary.join(", ")}.` : "",
        devices.length ? `Habitual devices: ${devices.join(", ")}.` : "",
        exemplars.length ? `Exemplar lines:\n${exemplars.map((e) => `- ${clip(e, 80)}`).join("\n")}` : "",
      ].filter(Boolean).join("\n"),
    };
  },

  async refineStyle({ style, feedback, original, edited }: { style: StyleRef; feedback?: string; original?: string; edited?: string }) {
    if (!feedback && !(original && edited)) throw new Error("Provide feedback or original+edited");
    const rules: string[] = [];
    if (feedback) rules.push(`User feedback: ${feedback}`);
    if (original && edited) {
      const diff = sentences(edited).length - sentences(original).length;
      rules.push(`Edits tend to ${diff < 0 ? "merge and shorten sentences" : diff > 0 ? "split into more sentences" : "keep sentence count but reword"}.`);
    }
    return { prompt: `${style.prompt}\n${rules.map((r) => `- ${r}`).join("\n")}`, changelog: rules.map((r) => `+ ${clip(r, 80)}`) };
  },

  async compose({ topic, platform, references = [] }: A<"compose">) {
    const points = references.flatMap((r) => sentences(r.text).slice(0, 2));
    const body = (points.length ? points : [`围绕「${topic}」,先讲背景,再讲关键判断,最后给出可执行的建议。`]).map((p) => `- ${p}`).join("\n");
    if (platform === "x") return clip(`${topic}:${points[0] ?? "一个值得展开的话题"}`, 280);
    return `# ${topic}\n\n## 为什么现在谈这个\n\n${body}\n\n## 关键判断\n\n(待补充:你的观点)\n\n## 接下来怎么做\n\n(待补充:行动建议)`;
  },
};

const real = () => llmMode() === "anthropic";
type A<K extends "rewrite" | "refineStyle" | "compose"> = Parameters<(typeof ai)[K]>[0];

export const rewrite = (a: A<"rewrite">) => (real() ? ai.rewrite(a) : mock.rewrite(a));
export const learnStyle = (samples: string[]) => (real() ? ai.learnStyle(samples) : mock.learnStyle(samples));
export const refineStyle = (a: A<"refineStyle">) => (real() ? ai.refineStyle(a) : mock.refineStyle(a));
export const compose = (a: A<"compose">) => (real() ? ai.compose(a) : mock.compose(a));
