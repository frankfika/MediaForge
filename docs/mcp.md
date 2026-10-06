# MediaForge MCP server

让 Claude Code / Cursor / Codex 直接调用 MediaForge。stdio 传输,4 个工具:

| 工具 | 作用 |
|------|------|
| `rewrite_url` | 抓取链接(X / 小红书 / B 站 / 公众号 / 任意文章)并改写成指定平台文案,媒体原样透传 |
| `compose_post` | 从话题(可附参考链接)写长文 Markdown 或单平台短文 |
| `learn_style` | 从样本(URL 或正文)学习风格,返回 `style`(含 `prompt`) |
| `refine_style` | 用反馈或「原稿→改稿」对修正风格,返回下一版 + changelog |

`style` 参数形如 `{ "name": "我的号", "prompt": "…" }`,即 `learn_style` 返回的内容。

## LLM:mock 与真模型

`lib/llm.ts` 按环境变量切换:

- **无 `ANTHROPIC_API_KEY`(默认)**:确定性模板 mock,不联网调模型(`rewrite_url` 抓链接仍需网络)。输出是可用的字符串,但**不是真正的改写/风格学习**,仅用于跑通流程与演示。
- **有 `ANTHROPIC_API_KEY`**:自动走 Claude(`ANTHROPIC_MODEL` 可覆盖,默认 `claude-sonnet-4-5`)。

每个工具返回的 JSON 顶层都有 `"llm": "mock" | "anthropic"`,调用方可据此判断。

## 先本地验证

```bash
pnpm install
pnpm mcp          # 看到 stderr: [mediaforge-mcp] ready (llm: mock) 即正常;stdout 是协议通道
```

## 接入

下面 `/ABS/PATH/MediaForge` 换成项目绝对路径。需要真模型就在 `env` 里加 `"ANTHROPIC_API_KEY": "sk-ant-..."`。

### Claude Code

`~/.claude/mcp_servers.json`(或项目根 `.mcp.json`;也可一条命令:`claude mcp add mediaforge -- pnpm --dir /ABS/PATH/MediaForge -s mcp`):

```json
{
  "mcpServers": {
    "mediaforge": {
      "command": "pnpm",
      "args": ["--dir", "/ABS/PATH/MediaForge", "-s", "mcp"]
    }
  }
}
```

> 不同版本的 Claude Code 读取的文件位置不同;如果上面的文件没生效,用 `claude mcp add` 最稳,`claude mcp list` 检查。

### Cursor

项目内 `.cursor/mcp.json`(全局则 `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "mediaforge": {
      "command": "pnpm",
      "args": ["--dir", "/ABS/PATH/MediaForge", "-s", "mcp"]
    }
  }
}
```

### Codex

按需求写在 `~/.codex/mcp.json`,格式同上。注意:Codex CLI 官方配置是 `~/.codex/config.toml`,若 json 不被读取,用:

```toml
[mcp_servers.mediaforge]
command = "pnpm"
args = ["--dir", "/ABS/PATH/MediaForge", "-s", "mcp"]
```

## 试用

在客户端里说:「用 mediaforge 的 learn_style 从这段文字学个风格」「用 rewrite_url 把 https://example.com 改成小红书和 X 文案」。

## 限制

- 小红书登录态笔记:传 `xhs_cookie`(尽力而为,不保证绕过风控)。
- MCP 服务无状态,风格不落库;要保存请自行保存返回的 `style`。
- `rewrite_url` 拒绝内网地址。
