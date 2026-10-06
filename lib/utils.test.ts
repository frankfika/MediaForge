import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("drops falsy values", () => expect(cn("a", null, undefined, false, "", "b")).toBe("a b"));
  it("flattens arrays and objects", () => expect(cn(["a", ["b"]], { c: true, d: false })).toBe("a b c"));
  it("lets later tailwind classes win", () => expect(cn("p-2 text-red-500", "p-4")).toBe("text-red-500 p-4"));
  it("returns empty string for no input", () => expect(cn()).toBe(""));
});
