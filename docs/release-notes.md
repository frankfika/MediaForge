# MediaForge v0.1.0 发布说明:一个链接,四种声音

> 贴一个链接,或说一个话题。AI 用*你的*文风,写给公众号、X、小红书、B 站。复制,发布。

## 我们为什么做 MediaForge

如果你同时运营多个内容平台,你一定熟悉这个夜晚:

你看到一篇好文章,想转发到公众号;想拆成三条 tweet;想改成小红书那种「姐妹们谁懂啊」的口吻;还想发到 B 站专栏。同一件事,你要打开四个编辑器,重写四遍,每一遍都在假装自己是另一个平台的人。

更糟的是「代写感」。用通用 AI 写,读者一眼就看出来——太正确,太光滑,没有你的口头禅、你的节奏、你的禁忌。改回自己的声音,又要花比手写还长的时间。

MediaForge 的想法很简单:**风格是你教的,平台切换是它做的。** 你给它 3–5 篇你写过的文章,它学你的句长、你的标志词、你不爱用的表达;然后你只负责一件事——贴链接,或者说一句「围绕这个话题写一篇」。剩下的抓取、改写、配图保留、多平台适配,全是它的。

## v0.1 怎么改变你的工作流

### 场景一:看到好文,一键变成「你的」推文

你在 X 上看到一篇长文,复制链接,粘进 MediaForge 的改写框,勾选 X 和小红书,点「抓取并改写」。十几秒后,你得到两版草稿:一版是符合 X 字数习惯的短线程,一版是小红书格式(带 emoji 节奏和换行习惯)。原文的图片和视频被原样保留,不用重新下载上传。

![改写模式](assets/rewrite.png)

### 场景二:一句话 brief,得到四平台的初稿

编辑部临时要一篇「AI 编程助手的下一步」。你在创作模式里只写这一句,附上两个参考链接,MediaForge 先生成完整长文,再按公众号、X、小红书、B 站的各自习惯拆分适配。你不再从空白页开始,而是从一份 80 分的草稿开始——你只做那 20% 的判断和润色。

![创作模式](assets/demo-output.png)

### 场景三:AI 终于学会了「你的声音」

这是 v0.1 我们最花心思的部分。风格 Agent 会分析你给的样本:平均句长、词汇重叠、节奏、修辞习惯、禁忌。学完之后它不是存一段模糊的「风格描述」,而是生成一个**可迭代、可回滚、可导出**的风格文件。你说「太正式了,多用短句和反问」,它做针对性修正,记录 v1 → v2 的变化;你不满意,一键回滚。版本对比界面能并排看到两版风格 Prompt 的 diff。

![风格 Agent](assets/styles.png)

### 场景四:对话优先——它不是表单,是个助手

上面所有功能都不是一堆表单字段,而是一个全局对话抽屉。你可以随口说「把刚才那个改得更口语一点」,也可以贴链接让它自己决定抓什么、怎么改。抓取、改写、学风格,对 Agent 来说都是工具;UI 只负责把工具结果漂亮地渲染出来。顺手还能用自然语言搜索你存过的风格和内容。

![对话抽屉](assets/chat-drawer.png)

## 对开发者:MediaForge 自己就是 MCP server

MediaForge 通过 MCP 暴露工具,可以被 Claude Code / Cursor / Codex 调用——让编程助手直接帮你「把这篇文章改写成小红书风格并导出」。不装 AI key 也能跑:所有路由都有确定性的 mock LLM,响应里标 `"llm": "mock"`,右下角有徽章,方便试用和测试。接入真实模型只需填 `ANTHROPIC_API_KEY`。详见 [mcp.md](mcp.md)。

## v0.1 的数字

- 7 个页面 + 19 个 API 路由(含 `/api/ping` liveness + `/api/health` services/build/uptime)
- 191 个文件,约 11500 行 TypeScript / TSX
- 290 个单元测试(行覆盖 99.83%,分支 98.01%)+ 38 个 Playwright 端到端测试(全部 offline,Playwright `context.route()` stub 替代真实网络)
- 四语 UI(zh / en / ja / ko;175+ 字典 key,parity 测试防漂移)
- OpenAPI 3.1 spec + Stoplight Elements 渲染的 `/docs` viewer;7 路由有真实 requestBody / 200 response examples
- Home page 是真 dashboard:4 个 metric(30s 轮询 `/api/metrics`)+ 6 个 quick action 卡
- `/api/embed` 接 OpenAI `text-embedding-3-small`(`OPENAI_API_KEY` 即可,无 key 走 mock)
- `/api/search` retrieval over corpus(默认 5 文档)
- `/api/styles/[id]/{duplicate,rename,history,export}` 全套云端操作
- 风格盲测算法:5 信号加权(句长 0.25 / 词汇 0.25 / 节奏 0.20 / 句数 0.10 / 禁忌 0.20)
- MCP server stdio;`pnpm demo:mcp` 一行命令;Claude Code / Cursor / Codex 直连
- 公众号富文本 HTML 复制(行内样式,绕开微信编辑器 strip)+ ZIP 一键下载
- 全局 ⌘K 抽屉:任何页面都能召出 chat
- 主题切换(浅色/深色/跟随系统,cookie 持久化)+ 5-minute tour README + vercel.json + .editorconfig + scripts/push.sh 安全推送
- 风格学习/测评的 0-key demo 完整链路

## 路线图:v0.2 有什么

按优先级排序,欢迎提 issue 投票:

1. **真实 embedding 接入**——语义搜索从「演示流程」变成生产可用(接口已预留)。
2. **发布闭环**——从 MediaForge 直接推送到各平台草稿箱(平台 API 允许范围内)。
3. **团队协作**——风格库共享、多人共建一份「团队声音」。
4. **更多平台**——知乎、头条、Threads。
5. **移动端 PWA**——手机上完成「看到 → 改写 → 复制发布」全链路。

## 试试

```bash
pnpm install && cp .env.example .env.local
pnpm dev   # http://localhost:3000
```

打开首页,点「试一下:示例风格 + example.com → 4 平台」——不需要任何 key,30 秒看到它能做什么。

---

_MediaForge 是开源项目(MIT)。如果你也想让 AI 替你写、但用你的声音说话,欢迎 star、提 issue、提 PR。_
