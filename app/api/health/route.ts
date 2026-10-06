import pkg from "@/package.json";
import { llmMode } from "@/lib/llm";

export const dynamic = "force-dynamic";

const ENDPOINTS = ["chat", "global-chat", "rewrite", "compose", "export", "style/learn", "style/refine", "styles", "styles/:id", "styles/:id/refine", "styles/:id/rollback", "health"].map((p) => `/api/${p}`);

export const GET = () => Response.json({ ok: true, mode: llmMode(), version: pkg.version, endpoints: ENDPOINTS });
