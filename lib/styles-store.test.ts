import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_STYLES } from "./demo-styles";
import { loadDemoStyles, removeStyle, replaceStyles, setActiveStyle, upsertStyle, useStyles } from "./styles-store";
import type { Style } from "./types";

const mk = (id: string, name = id): Style => ({ id, name, prompt: `p-${name}`, version: 1 });
const saved = () => JSON.parse(localStorage.getItem("mediaforge.styles")!) as { styles: Style[]; active: string | null };

beforeEach(() => localStorage.clear());

describe("styles-store", () => {
  it("upsert adds, auto-activates the first, keeps active on later adds", () => {
    upsertStyle(mk("a"));
    upsertStyle(mk("b"));
    expect(saved().styles.map((s) => s.id)).toEqual(["a", "b"]);
    expect(saved().active).toBe("a");
  });

  it("upsert overwrites an existing id in place", () => {
    upsertStyle(mk("a", "old"));
    upsertStyle(mk("b"));
    upsertStyle(mk("a", "new"));
    expect(saved().styles.map((s) => s.name)).toEqual(["new", "b"]);
  });

  it("remove deletes, ignores unknown ids, nulls active when removing it", () => {
    upsertStyle(mk("a"));
    upsertStyle(mk("b"));
    removeStyle("zzz");
    expect(saved().styles).toHaveLength(2);
    removeStyle("b");
    expect(saved().active).toBe("a");
    removeStyle("a");
    expect(saved()).toEqual({ styles: [], active: null });
  });

  it("setActiveStyle sets and clears", () => {
    upsertStyle(mk("a"));
    upsertStyle(mk("b"));
    setActiveStyle("b");
    expect(saved().active).toBe("b");
    setActiveStyle(null);
    expect(saved().active).toBeNull();
  });

  it("replaceStyles keeps a surviving active, else falls back to first, else null", () => {
    upsertStyle(mk("a"));
    setActiveStyle("a");
    replaceStyles([mk("x"), mk("a")]);
    expect(saved().active).toBe("a");
    replaceStyles([mk("x"), mk("y")]);
    expect(saved().active).toBe("x");
    replaceStyles([]);
    expect(saved()).toEqual({ styles: [], active: null });
  });

  it("loadDemoStyles is idempotent and activates the first demo", () => {
    loadDemoStyles();
    loadDemoStyles();
    expect(saved().styles).toHaveLength(DEMO_STYLES.length);
    expect(saved().active).toBe(DEMO_STYLES[0]!.id);
  });

  it("useStyles reflects writes and storage events, and unsubscribes on unmount", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    let latest!: ReturnType<typeof useStyles>;
    const Probe = () => ((latest = useStyles()), null);
    const root = createRoot(document.createElement("div"));
    await act(async () => root.render(createElement(Probe)));
    expect(latest).toEqual({ styles: [], active: null });

    await act(async () => upsertStyle(mk("a")));
    expect(latest.styles).toHaveLength(1);
    expect(latest.active?.id).toBe("a");

    await act(async () => {
      localStorage.setItem("mediaforge.styles", JSON.stringify({ styles: [mk("q")], active: "gone" }));
      window.dispatchEvent(new Event("storage"));
    });
    expect(latest.styles[0]!.id).toBe("q");
    expect(latest.active).toBeNull(); // dangling active resolves to null

    await act(async () => root.unmount());
    const before = latest;
    upsertStyle(mk("z")); // no subscriber -> no render, no throw
    expect(latest).toBe(before);
  });
});
