import { describe, expect, it, vi } from "vitest";
import { DEMO_STYLES } from "./demo-styles";
import { exportStyle, exportStyles, parseImport } from "./style-transfer";

describe("style-transfer", () => {
  it("round-trips single and many", () => {
    expect(parseImport(exportStyle(DEMO_STYLES[0]!))).toEqual([DEMO_STYLES[0]]);
    expect(parseImport(exportStyles(DEMO_STYLES))).toEqual(DEMO_STYLES);
  });
  it("skips invalid items, dedupes by id, rejects garbage", () => {
    const ok = DEMO_STYLES[0]!;
    expect(parseImport(JSON.stringify([ok, ok, { id: "x" }, null, 3, { ...ok, id: "y", prompt: "" }]))).toEqual([ok]);
    expect(parseImport("{not json")).toEqual([]);
    expect(parseImport(JSON.stringify({ styles: [ok], __proto__: { x: 1 } }))).toEqual([ok]);
  });
});

describe("downloadStyles", () => {
  it("creates a blob URL, clicks an anchor with the filename, then revokes", async () => {
    const { downloadStyles } = await import("./style-transfer");
    const create = vi.fn(() => "blob:x");
    const revoke = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("s.json");
      expect(this.href).toBe("blob:x");
    });
    downloadStyles("s.json", DEMO_STYLES);
    expect((create.mock.calls[0] as unknown as [Blob])[0].type).toBe("application/json");
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:x");
    click.mockRestore();
    vi.unstubAllGlobals();
  });
});
