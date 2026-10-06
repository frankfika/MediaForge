// Spawns the stdio MCP server and walks learn_style -> rewrite_url. Works without API keys (mock LLM); rewrite_url needs network.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "mcp-demo", version: "0.1.0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", "scripts/mcp-server.ts"], stderr: "inherit" }));

const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content[0].text;
  if (r.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text);
};

try {
  const tools = (await client.listTools()).tools.map((t) => t.name);
  const learned = await call("learn_style", { name: "极简技术流", samples: ["写代码像写诗。少即是多。先跑起来,再谈优雅。", "别堆框架。删掉的代码,永远不会出 bug。"] });
  const rewritten = await call("rewrite_url", { url: "https://example.com", platforms: ["x", "xhs"], style: learned.style });
  console.log(JSON.stringify({
    tools,
    llm: learned.llm,
    style: { name: learned.style.name, version: learned.style.version, features: learned.style.features, prompt: learned.style.prompt.slice(0, 120) },
    rewrite: { source: rewritten.source.title, posts: rewritten.posts.map((p) => ({ platform: p.platform, title: p.title, body: p.body.slice(0, 120) })) },
  }, null, 2));
} finally {
  await client.close();
}
