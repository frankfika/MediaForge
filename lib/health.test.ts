import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { metricsFileWritable, pathReadable } from "./health";

let dir = "";
let prevMetricsFile: string | undefined;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mf-health-"));
  prevMetricsFile = process.env.METRICS_FILE;
  // metrics.ts writes to a file in a sub-directory; pre-create the sub.
  process.env.METRICS_FILE = join(dir, "sub", "metrics.json");
  mkdirSync(join(dir, "sub"), { recursive: true });
  writeFileSync(process.env.METRICS_FILE, "{}");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (prevMetricsFile === undefined) delete process.env.METRICS_FILE;
  else process.env.METRICS_FILE = prevMetricsFile;
});

describe("metricsFileWritable", () => {
  it("returns ok when the file path can be written", () => {
    const r = metricsFileWritable();
    expect(r.ok).toBe(true);
    expect(r.detail).toBeUndefined();
  });

  it("returns ok:false when the parent dir is a file", () => {
    // Make METRICS_FILE point under a file (not a directory) so mkdir fails.
    process.env.METRICS_FILE = join(dir, "not-a-dir", "x");
    writeFileSync(join(dir, "not-a-dir"), "");
    const r = metricsFileWritable();
    expect(r.ok).toBe(false);
    expect(typeof r.detail).toBe("string");
  });

  it("survives a read-only FS (serverless-like)", () => {
    // Set METRICS_FILE inside a path that the OS will refuse (NUL byte on macOS).
    // The metrics writer in lib/metrics.ts has a catch{} branch, and our
    // metricsFileWritable() mirrors it. The point is: it returns ok:false
    // gracefully, never throws.
    process.env.METRICS_FILE = "\u0000/not-writable/metrics.json";
    const r = metricsFileWritable();
    expect(r.ok).toBe(false);
    expect(typeof r.detail).toBe("string");
  });
});

describe("pathReadable", () => {
  it("returns ok when the file exists", () => {
    const p = join(dir, "x");
    writeFileSync(p, "");
    expect(pathReadable(p)).toEqual({ ok: true });
  });
  it("returns ok:false with detail when missing", () => {
    expect(pathReadable(join(dir, "nope"))).toEqual({ ok: false, detail: "missing" });
  });
});
