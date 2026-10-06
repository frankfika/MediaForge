import { describe, expect, it } from "vitest";
import { assertPublic } from "./fetcher";

describe("assertPublic", () => {
  it.each(["http://localhost/", "http://127.0.0.1/", "http://10.0.0.1/", "http://192.168.1.1/", "http://172.20.0.1/", "http://169.254.169.254/", "http://[::1]/"])("rejects %s", (u) => {
    expect(() => assertPublic(new URL(u))).toThrow();
  });
  it("rejects non-http", () => expect(() => assertPublic(new URL("file:///etc/passwd"))).toThrow());
  it("accepts example.com", () => expect(() => assertPublic(new URL("https://example.com"))).not.toThrow());
});
