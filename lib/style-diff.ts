import { diffLines } from "diff";
import type { StyleProfile, StyleVersion } from "./types";

type Features = NonNullable<StyleProfile["features"]>;
export type Chunk = { type: "same" | "added" | "removed"; text: string };
export type StyleDiff = {
  prompt: { added: number; removed: number; chunks: Chunk[] };
  features: { vocabulary: ListDiff; devices: ListDiff; taboos: ListDiff; avgSentenceLength: number; rhythmChanged: boolean };
};
type ListDiff = { added: string[]; removed: string[] };

const nl = (s: string) => (s && !s.endsWith("\n") ? `${s}\n` : s); // diffLines would flag a missing trailing newline as a change
const list = (a: string[] = [], b: string[] = []): ListDiff => ({
  added: b.filter((x) => !a.includes(x)),
  removed: a.filter((x) => !b.includes(x)),
});

/** Line-level prompt diff (added/removed are line counts) plus set-diffs of the feature lists. */
export function diffStyleVersions(from: StyleVersion, to: StyleVersion): StyleDiff {
  const chunks: Chunk[] = [];
  let added = 0;
  let removed = 0;
  for (const c of diffLines(nl(from.prompt), nl(to.prompt))) {
    const lines = c.value.split("\n").length - 1;
    if (c.added) added += lines;
    else if (c.removed) removed += lines;
    chunks.push({ type: c.added ? "added" : c.removed ? "removed" : "same", text: c.value });
  }
  const a: Partial<Features> = from.features ?? {};
  const b: Partial<Features> = to.features ?? {};
  return {
    prompt: { added, removed, chunks },
    features: {
      vocabulary: list(a.vocabulary, b.vocabulary),
      devices: list(a.devices, b.devices),
      taboos: list(a.taboos, b.taboos),
      avgSentenceLength: (b.avgSentenceLength ?? 0) - (a.avgSentenceLength ?? 0),
      rhythmChanged: (a.rhythm ?? "") !== (b.rhythm ?? ""),
    },
  };
}
