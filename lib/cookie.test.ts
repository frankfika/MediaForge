import { beforeEach, describe, expect, it, vi } from "vitest";
import { getXhsCookie, isXhsUrl, setXhsCookie } from "./cookie";

const KEY = "mediaforge.xhsCookie";
beforeEach(() => localStorage.clear());

describe("xhs cookie", () => {
  it("returns undefined when unset", () => expect(getXhsCookie()).toBeUndefined());

  it("round-trips ASCII and trims whitespace", () => {
    setXhsCookie("  a1=b; web_session=xyz \n");
    expect(getXhsCookie()).toBe("a1=b; web_session=xyz");
  });

  it("round-trips non-ASCII (UTF-8) and stores base64, not plaintext", () => {
    setXhsCookie("name=小红书🍠");
    expect(getXhsCookie()).toBe("name=小红书🍠");
    expect(localStorage.getItem(KEY)).not.toContain("name=");
  });

  it("blank input clears the stored cookie", () => {
    setXhsCookie("a=1");
    setXhsCookie("   ");
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(getXhsCookie()).toBeUndefined();
  });

  it("degrades to undefined on corrupt base64 or storage errors", () => {
    localStorage.setItem(KEY, "%%%not-base64%%%");
    expect(getXhsCookie()).toBeUndefined();
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    expect(getXhsCookie()).toBeUndefined();
    spy.mockRestore();
  });

  it("isXhsUrl matches xiaohongshu and xhslink hosts only", () => {
    expect(isXhsUrl("https://www.xiaohongshu.com/explore/1")).toBe(true);
    expect(isXhsUrl("http://xhslink.com/abc")).toBe(true);
    expect(isXhsUrl("https://example.com")).toBe(false);
  });
});
