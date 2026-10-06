import { z } from "zod";
import { StyleProfileSchema, StyleRefSchema, type Style } from "./types";

const ImportSchema = StyleRefSchema.extend({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(60),
  prompt: z.string().min(1).max(20000),
  features: StyleProfileSchema.shape.features.optional(),
});

export const exportStyle = (s: Style) => JSON.stringify(s, null, 2);
export const exportStyles = (styles: Style[]) => JSON.stringify(styles, null, 2);

/** Accepts a single style, an array, or `{ styles: [...] }`. JSON.parse + zod only; invalid items are skipped, duplicate ids keep the first. */
export function parseImport(json: string): Style[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { styles?: unknown }).styles)
      ? (raw as { styles: unknown[] }).styles
      : [raw];
  const seen = new Set<string>();
  return list.flatMap((item) => {
    const r = ImportSchema.safeParse(item);
    if (!r.success || seen.has(r.data.id)) return [];
    seen.add(r.data.id);
    return [r.data satisfies Style];
  });
}

export function downloadStyles(filename: string, styles: Style[]) {
  const url = URL.createObjectURL(new Blob([exportStyles(styles)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
