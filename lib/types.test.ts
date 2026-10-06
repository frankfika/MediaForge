import { describe, expect, it } from "vitest";
import {
  CreateStyleRequestSchema,
  FeedbackRequestSchema,
  PlatformPostSchema,
  PlatformSchema,
  RollbackRequestSchema,
  SourceSchema,
  StyleProfileSchema,
  StyleRefSchema,
  apiToStyle,
  type ApiStyle,
} from "./types";

const features = { avgSentenceLength: 12, vocabulary: ["a"], rhythm: "short", devices: ["q"], taboos: ["!"] };
const ok = (s: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => expect(s.safeParse(v).success).toBe(true);
const bad = (s: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => expect(s.safeParse(v).success).toBe(false);

describe("schemas", () => {
  it("PlatformSchema accepts enum, rejects others", () => {
    for (const p of ["wechat", "x", "xhs", "bilibili"]) ok(PlatformSchema, p);
    bad(PlatformSchema, "weibo");
    bad(PlatformSchema, "");
  });
  it("SourceSchema", () => {
    const s = { url: "", title: "t", author: "a", text: "x", images: [], videos: [] };
    ok(SourceSchema, s);
    bad(SourceSchema, { ...s, images: "a.png" });
    bad(SourceSchema, { ...s, title: undefined });
  });
  it("PlatformPostSchema: title optional, platform enum enforced", () => {
    ok(PlatformPostSchema, { platform: "x", body: "hi" });
    ok(PlatformPostSchema, { platform: "xhs", title: "t", body: "" });
    bad(PlatformPostSchema, { platform: "tiktok", body: "hi" });
    bad(PlatformPostSchema, { platform: "x" });
  });
  it("StyleProfileSchema", () => {
    ok(StyleProfileSchema, { features, prompt: "p" });
    bad(StyleProfileSchema, { features: { ...features, avgSentenceLength: "12" }, prompt: "p" });
    bad(StyleProfileSchema, { features, prompt: undefined });
  });
  it("StyleRefSchema defaults version to 1 and requires int", () => {
    expect(StyleRefSchema.parse({ id: "i", name: "n", prompt: "p" }).version).toBe(1);
    bad(StyleRefSchema, { id: "i", name: "n", prompt: "p", version: 1.5 });
    bad(StyleRefSchema, { id: "i", name: "n" });
  });
  it("CreateStyleRequestSchema bounds", () => {
    ok(CreateStyleRequestSchema, { name: "n", prompt: "p" });
    ok(CreateStyleRequestSchema, { id: crypto.randomUUID(), name: "n".repeat(60), prompt: "p", features });
    bad(CreateStyleRequestSchema, { name: "", prompt: "p" });
    bad(CreateStyleRequestSchema, { name: "n".repeat(61), prompt: "p" });
    bad(CreateStyleRequestSchema, { name: "n", prompt: "" });
    bad(CreateStyleRequestSchema, { id: "not-uuid", name: "n", prompt: "p" });
  });
  it("FeedbackRequestSchema needs feedback or original+edited, max 1000", () => {
    ok(FeedbackRequestSchema, { feedback: "短一点" });
    ok(FeedbackRequestSchema, { original: "a", edited: "b" });
    bad(FeedbackRequestSchema, {});
    bad(FeedbackRequestSchema, { feedback: "" });
    bad(FeedbackRequestSchema, { original: "a" });
    bad(FeedbackRequestSchema, { feedback: "x".repeat(1001) });
    ok(FeedbackRequestSchema, { feedback: "x".repeat(1000) });
  });
  it("RollbackRequestSchema needs positive int", () => {
    ok(RollbackRequestSchema, { version: 1 });
    bad(RollbackRequestSchema, { version: 0 });
    bad(RollbackRequestSchema, { version: 1.2 });
  });
});

describe("apiToStyle", () => {
  const api: ApiStyle = { id: "i", name: "n", currentVersion: 3, prompt: "p", createdAt: "2026-01-01" };
  it("maps currentVersion → version and omits absent features", () => {
    const s = apiToStyle(api);
    expect(s).toEqual({ id: "i", name: "n", prompt: "p", version: 3 });
    expect("features" in s).toBe(false);
    expect(apiToStyle({ ...api, features: null })).not.toHaveProperty("features");
  });
  it("keeps features when present", () => {
    expect(apiToStyle({ ...api, features }).features).toEqual(features);
  });
});
