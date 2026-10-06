import { describe, expect, it } from "vitest";
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
