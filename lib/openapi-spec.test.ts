import { describe, expect, it } from "vitest";
import { openapiSpec } from "./openapi-spec";

describe("openapi-spec", () => {
  it("declares OpenAPI 3.1.0", () => {
    expect(openapiSpec.openapi).toBe("3.1.0");
  });

  it("has a title and version", () => {
    const info = openapiSpec.info as { title: string; version: string };
    expect(info.title).toBe("MediaForge API");
    expect(info.version).toBe("0.1.0");
  });

  it("lists local and deployment servers", () => {
    const servers = openapiSpec.servers as { url: string; description: string }[];
    expect(servers.map((s) => s.url)).toContain("http://localhost:3000");
    expect(servers.length).toBeGreaterThanOrEqual(2);
  });

  it("documents every API route the app exposes", () => {
    const paths = openapiSpec.paths as Record<string, unknown>;
    // expected API route prefixes (root-level); /mcp-guide.md is a static
    // asset so we don't include it here.
    const expected = [
      "/api/health",
      "/api/metrics",
      "/api/chat",
      "/api/global-chat",
      "/api/rewrite",
      "/api/compose",
      "/api/export",
      "/api/style/learn",
      "/api/style/refine",
      "/api/style/judge",
      "/api/styles",
      "/api/embed",
      "/api/embed/{query}",
      "/api/search",
      "/api/openapi.json",
    ];
    for (const p of expected) expect(paths).toHaveProperty(p);
  });

  it("exposes a security scheme for the mock user-id header", () => {
    const components = openapiSpec.components as { securitySchemes: Record<string, unknown> };
    expect(components.securitySchemes).toHaveProperty("UserIdHeader");
  });

  it("tags cover every API surface", () => {
    const tags = (openapiSpec.tags as { name: string }[]).map((t) => t.name);
    for (const name of ["Chat", "Rewrite", "Compose", "Style", "Styles", "Embed", "Search", "Metrics", "Health", "Ops"]) {
      expect(tags).toContain(name);
    }
  });
});