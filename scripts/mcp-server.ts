// stdio MCP server entry. stdout is the protocol channel: log to stderr only.
import { llmMode } from "../lib/llm";
import { serve } from "../lib/mcp-server";

serve().then(() => console.error(`[mediaforge-mcp] ready (llm: ${llmMode()})`));
