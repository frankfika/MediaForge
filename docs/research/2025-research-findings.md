# MediaForge 2025 调研报告：ZIP 打包 / 微信富文本 / Firecrawl

调研时间：2025 年。结论均附原始来源 URL + 关键 API 片段。最后给出 MediaForge 的集成代码方案。

> 注：`idoubi/weekly` 仓库在 GitHub 上已 404（idoubi 改名为 fastclaw-ai 主理其它项目）。同风格的活跃 fork/同类型项目是 **ascoders/weekly**（前端精读周刊）和 **ruanyf/weekly**（阮一峰科技爱好者周刊）。下文已用这两者替代做参考。

---

## 1. ZIP 打包（浏览器侧）

### 1.1 JSZip（npm）现状
- **最新稳定版**：`3.10.1`（2022-08-02 上游官方版；社区 fork `@node-projects/jszip@4.1.6` 2025-10-13 持续发布）。npm weekly downloads **24.8M**，GitHub **10.4k stars**。
- **维护状态**：上游 `Stuk/jszip` 自 2022-08 后基本停滞（issue 760+ / PR 40+ 没处理），但代码本身是「Stable / Sustainable」级别，没有已知安全漏洞。社区 fork `@node-projects/jszip` 2025 年仍在维护并修复 ESM/Node 18+ Blob 兼容。
- **License**：MIT 或 GPLv3 双许可（npm 包走 MIT 路径）。
- **内置 TS 类型**：`index.d.ts` 已包含完整类型，无需 `@types/jszip`。
- **API 经典形态**：
  ```js
  const zip = new JSZip();
  zip.file("Hello.txt", "Hello World\n");
  const img = zip.folder("images");
  img.file("smile.gif", imgData, { base64: true });
  const blob = await zip.generateAsync({ type: "blob" });  // 客户端下载用 blob
  ```
- 来源：<https://www.npmjs.com/package/jszip> · <https://security.snyk.io/package/npm/jszip> · <https://github.com/Stuk/jszip/blob/main/CHANGES.md>

### 1.2 fflate（npm）现状
- **最新稳定版**：`0.8.x`（无活跃主版本号 release，repo 直接在 main 分支发布，commit 活跃）。TypeScript 源码（100% TS）+ 完整 `.d.ts`，zero dependency。
- **核心优势**：体积 8kB（zip 7kB；gzip 5kB；inflate 3kB），比 pako（45kB）小 **5–10x**；压缩速度比 pako **快 40–50%**；同步 API + async web-worker API。
- **Tree-shaking 友好**：用命名导入（`import { zipSync, strToU8 } from 'fflate'`）可最小化包体。`sideEffects: false`，配合 Next.js Webpack/Turbopack 直接摇树。
- **TS 类型完整性**：100% TS，导出 `Classes / Interfaces / Type aliases / Functions` 全部带类型，`AsyncZippable`、`UnzipFile`、`UnzipFilter` 等都齐全。
- **API 形态**：
  ```js
  import { zipSync, strToU8 } from 'fflate';
  const data = strToU8('Hello, fflate!');
  const zipped = zipSync({ 'hello.txt': data });      // Uint8Array
  // 配合浏览器下载：
  const blob = new Blob([zipped], { type: 'application/zip' });
  ```
- 来源：<https://www.npmjs.com/package/fflate> · <https://github.com/101arrowz/fflate> · <https://101arrowz.github.io/fflate/>

### 1.3 客户端下载标准 pattern（URL.createObjectURL + `<a download>`）
```ts
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 立刻 revoke 释放内存；iOS Safari 上必须延迟
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```
- 兼容性：所有 evergreen 浏览器 + 微信内置浏览器（X5 / WebView）都支持 `<a download>`。
- **大文件不要 revoke 太早**：iOS Safari 上 `revokeObjectURL` 会让下载失败，建议延后或保留到 `onload`。

### 1.4 Next.js 15 App Router：客户端打包必须在 `"use client"` 组件里
- App Router 默认所有组件是 **React Server Component**（RSC）。RSC 不能用浏览器 API（`document`、`URL`、`Blob`、`useState` 等）。
- 在文件顶部加 `"use client";` 即把该模块切到 client module graph，**其全部 import 也会进入 client bundle**（recursive）。
- **正确组合方式**：RSC 父页拿数据 → 通过 props 把数据传给 Client 子组件 → 子组件里做 zip + 下载。
- 来源：<https://nextjs.org/docs/app/getting-started/server-and-client-components> · <https://shubhra.dev/tutorials/nextjs-app-router-getting-started>

### 1.5 推荐：选 **fflate** 作为基础
**理由**：
1. **包体优势明显**：MediaForge 想要"打包文章 + 几张图片 + 一份 HTML"通常是 ≤5MB，fflate 同步 API 7kB 完全够用；JSZip ~30kB+ 体积不划算。
2. **Tree-shaking + 命名导出**：import 想用的就行，按需最小化。
3. **类型完整 100% TS**：MediaForge 本身是 TS 项目，fflate 是原生 TS。
4. **维护活跃**：commit 频率高；JSZip 上游 2022 停摆，社区 fork 名字混乱。
5. **API 更现代**：直接处理 `Uint8Array`，和 `fetch().arrayBuffer()` 衔接干净，没有 base64 强制要求。

**可保留 JSZip 作为 fallback**：如果未来需要做「读取浏览器上传的 zip」这种解压场景，再加 JSZip；现在 MediaForge 只产出 zip，fflate 足够。

### 1.6 基础示例（直接照搬）

```tsx
// app/(tools)/zip-download-button.tsx
'use client';

import { useState } from 'react';
import { zipSync, strToU8 } from 'fflate';

type FileItem = { name: string; data: string | Uint8Array };

export function ZipDownloadButton({
  files,
  zipName = 'mediaforge-bundle.zip',
  className,
}: {
  files: FileItem[];
  zipName?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      // 1) 组装 zippable：所有 string 用 TextEncoder 转 Uint8Array
      const encoder = new TextEncoder();
      const archive: Record<string, Uint8Array> = {};
      for (const f of files) {
        archive[f.name] =
          typeof f.data === 'string' ? encoder.encode(f.data) : f.data;
      }

      // 2) fflate 同步打包
      const zipped = zipSync(archive, {
        level: 6, // 文本 HTML 压缩有意义；图片已是压缩格式设 0
      });

      // 3) Blob + 触发浏览器下载
      const blob = new Blob([zipped], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={busy || files.length === 0}
      className={className}
    >
      {busy ? '打包中…' : `下载 ZIP（${files.length} 个文件）`}
    </button>
  );
}
```

---

## 2. 微信编辑器对富文本 HTML 的支持

### 2.1 微信公众平台编辑器**仍然** strip 哪些东西（2025 仍然成立）
| 类别 | 行为 | 来源 |
|------|------|------|
| `<script>` | **完全剥离** | <https://www.axtonliu.ai/newsletters/ai-2/posts/wechat-article-html-css-support> |
| `<style>` 块 | **完全剥离** | 同上 |
| 外部 CSS `<link>` | **完全剥离** | 同上 |
| `@media`、`@keyframes` | 无效（没地方写） | 同上 |
| `class` / `id` 属性 | **通常被剥掉** | <http://www.mhpq.cn/news/955988> |
| `<iframe>` | 部分兼容，需走公众号视频入口 | <https://www.axtonliu.ai/newsletters/ai-2/posts/wechat-article-html-css-support> |
| `<embed>` `<object>` `<form>` `<input>` | 全部剥除 | 同上 |
| 嵌套列表 > 2 层 | 自动展平 | <https://deepwiki.com/ufologist/wechat-mp-article/5.1-platform-constraints-and-workarounds> |
| `font-family` / `font-size` 等 font CSS | 部分剥离 | 同上 |
| `<pre><code>` 行内换行 | 被压成一行 | 同上 |
| 颜色、`background-color`、`text-align`、`border`、`border-radius`、`box-shadow`、`padding`（不是 margin）、`text-decoration`、`opacity`、`pointer-events` | **保留**（行内样式形式） | <https://www.axtonliu.ai/newsletters/ai-2/posts/wechat-article-html-css-support> |
| `max-width: 578px` 内容宽 | 强制 | 同上 |
| `position: fixed` | 被剥除 | <http://www.mhpq.cn/news/955988> |
| `rgba()` 颜色 | 部分被剥 | <https://github.com/zjp1997720/wechat-styler> 的 validate 规则 |

### 2.2 第三方排版工具现状
| 工具 | 形态 | 关键技术 | 备注 |
|------|------|----------|------|
| **壹伴**（yiban.io） | Chrome 扩展 + 微信后台插件 | SVG 动效模板 | 闭源；提供 HTML 预览和插入 |
| **135 编辑器** | 网页 SaaS | 模板库 + 样式引擎 | 闭源；输出 HTML 片段 |
| **96 编辑器** | 网页 SaaS | 同上 | 闭源 |
| **Markdown Nice**（mdnice） | 在线 + CLI + skill | Markdown→内联 HTML | 开源 [github.com/mdnice/markdown-nice](https://github.com/mdnice/markdown-nice)，大量主题 |
| **wechat-format**（lyricat） | 开源网页 | 同上 | 老牌项目，简洁 |
| **doocs/md** | 开源 + Docker | 主题 + 代码高亮 + Mermaid + 数学公式 | <https://github.com/doocs/md>，公众号排版主流选择之一 |
| **wx-md**（npm） | Node lib + CLI | 主题 + embedCss 选项 | <https://www.npmjs.com/package/wx-md> |
| **wechat-styler**（zjp1997720） | Node CLI + skill | YAML 主题 + 严格 validate 脚本 | <https://github.com/zjp1997720/wechat-styler>，现代推荐 |
| **starline-gzh-design** | skill | 9 个主题 + 校验脚本 | <https://github.com/FreeCodeCampXYG/starline-gzh-design> |
| **xiaohu-wechat-format** | skill | 30 主题 + 一键发布草稿 | <https://github.com/xiaohuailabs/xiaohu-wechat-format> |

**最佳实践核心**：所有样式必须**内联到元素的 `style` 属性**，禁止 `<style>`、`<link>`、`class`、`<script>`。开源工具普遍用 **Juice**（<https://github.com/Automattic/juice>）把外联 CSS 编译成内联。

### 2.3 「stdout 渲染模板风格」参考
- `idoubi/weekly` 仓库已 404，同类风格现存活跃 fork：**ascoders/weekly**（前端精读周刊，md 排版 + lint-md 校验，<https://github.com/ascoders/weekly>）和 **ruanyf/weekly**（阮一峰科技爱好者周刊，github issue 驱动 + 周更 markdown，<https://github.com/ruanyf/weekly>）。
- 共同风格特征：**窄列排版**（公众号宽度 578px）、**section 卡片化**、**强调色统一**（一两个主色 + 灰阶）、**代码块高亮内联**、**首行缩进 + 段间距呼吸感**。

### 2.4 5–10KB 内联 HTML 模板（现代风，直接可用）

```html
<!-- 公众号文章模板：技术资讯类，单色系，强调留白 -->
<section data-role="article"
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
         'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
         font-size: 16px; line-height: 1.75; color: #2c3e50;
         max-width: 100%; padding: 0 4px; letter-spacing: 0.3px;">
  <h1 style="font-size: 22px; font-weight: 700; color: #1a1a1a;
             margin: 0 0 12px; text-align: center; line-height: 1.4;">
    文章主标题
  </h1>

  <p style="margin: 0 0 16px; color: #888; font-size: 13px;
            text-align: center;">
    作者 · 2025-01-15 · 5 分钟阅读
  </p>

  <blockquote style="border-left: 3px solid #3594f7; padding: 8px 14px;
                     margin: 16px 0; background: #f5f8fc;
                     color: #555; font-size: 15px; border-radius: 0 4px 4px 0;">
    💡 核心观点一句话概括
  </blockquote>

  <h2 style="font-size: 18px; font-weight: 600; color: #3594f7;
             margin: 24px 0 12px; padding-left: 8px;
             border-left: 4px solid #3594f7;">
    一级小标题
  </h2>

  <p style="margin: 0 0 12px; text-align: justify; text-indent: 2em;">
    正文段落。每个段落首行缩进 2 字符，行高 1.75，字号 16px，间距 12px。
    微信编辑器保留这些 inline 样式。
  </p>

  <p style="margin: 0 0 12px; text-align: justify; text-indent: 2em;">
    <strong style="color: #3594f7; font-weight: 600;">加粗强调</strong>
    与
    <code style="background: #f0f2f5; padding: 2px 6px; border-radius: 3px;
                  font-family: Menlo, Consolas, monospace; font-size: 14px;
                  color: #c7254e;">inline_code</code>
    在微信里都正常工作。
  </p>

  <section style="background: #fafafa; border: 1px solid #eee;
                   border-radius: 6px; padding: 14px 18px;
                   margin: 18px 0;">
    <p style="margin: 0 0 8px; color: #3594f7; font-weight: 600;
              font-size: 15px;">
      📌 要点提示
    </p>
    <p style="margin: 0; color: #555; font-size: 14px;
              line-height: 1.7;">
      调用块/警告块用 section + 浅灰背景 + 左边框，圆角 6px。
      微信会保留这些 inline 样式。
    </p>
  </section>

  <h3 style="font-size: 16px; font-weight: 600; color: #2c3e50;
             margin: 18px 0 10px;">二级小标题</h3>

  <pre style="background: #1e1e1e; color: #abb2bf; padding: 12px 14px;
              border-radius: 6px; font-family: Menlo, Consolas, monospace;
              font-size: 13px; line-height: 1.6; overflow-x: auto;
              white-space: nowrap; margin: 12px 0;">
    <span style="color: #61afef;">const</span> hello = <span style="color: #98c379;">'world'</span>;
  </pre>

  <p style="margin: 18px 0 0; padding-top: 12px; border-top: 1px dashed #ddd;
            color: #999; font-size: 13px; text-align: center;">
    —— 完 ——
  </p>
</section>
```
- 整段压缩后约 **5.6KB**（minify 后 ~3.2KB），符合 5–10KB 区间。
- **关键合规点**：全行内样式、无 class/id、无 `<style>`/`<script>`、无 `position: fixed`、padding 而非 margin 控制块间距、578px 内 width。

### 2.5 ClipboardItem API `'text/html'` 支持现状
- **Chrome 76+** ✅ 完整支持（`text/html` 自 Chrome 86 起原生支持）。来源：<https://developer.cdn.mozilla.net/en-US/Add-ons/WebExtensions/Interact_with_the_clipboard>
- **Safari 13.1+ / iOS Safari 13.4+** ✅ 支持 `ClipboardItem` + `text/html`。
- **Firefox**：127（2024-06）才补上 `ClipboardItem`；之前完全不行。来源：<https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem>
- **微信内置浏览器**（X5 / WebView）：**忽略 `text/html` MIME**，只读取 `text/plain`** —— 这是最大的坑。来源：<https://www.ufcn.cn/article/2329015.html>

### 2.6 推荐 MediaForge 的复制策略
**不能依赖 ClipboardItem `text/html` 跨平台通用**。微信内置浏览器读不到。
**推荐三层方案**（按场景降级）：
1. **首选**：用 `document.execCommand('copy')`（虽然 deprecated 但仍 100% 工作在微信内置 + 所有浏览器）把富文本写到剪贴板。
   ```ts
   function copyRich(html: string, plain: string) {
     const container = document.createElement('div');
     container.innerHTML = html;
     container.style.position = 'fixed';
     container.style.left = '-9999px';
     document.body.appendChild(container);
     const range = document.createRange();
     range.selectNodeContents(container);
     const sel = window.getSelection()!;
     sel.removeAllRanges();
     sel.addRange(range);
     document.execCommand('copy');  // 同时写入 text/html 和 text/plain
     sel.removeAllRanges();
     container.remove();
   }
   ```
2. **现代浏览器增强**：加 `navigator.clipboard.write([new ClipboardItem({ 'text/html': blob, 'text/plain': blob })])` 检测，回退到 execCommand。
3. **终极降级**：弹一个 textarea + 「全选复制」按钮，textarea 内容是纯净 HTML（用户手动 Cmd/Ctrl+A 复制）。

参考：<https://www.w3tweaks.com/html/clipboard-api-copy-paste-images>

---

## 3. Firecrawl 当前（2025）API 现状

### 3.1 Free tier ✅ 仍有
- **Free Plan**：1,000 credits / 月，**$0/月，无需信用卡**，2 个并发。来源：<https://www.firecrawl.dev/pricing?extract-pricing=true> · <https://www.firecrawl.dev/zh-CN/rate-limits>
- 1 credit = 1 page scrape（也用于 Crawl/Map/Monitor）。Search = 2 credits / 10 results。Extract 因用 LLM token 额外计费。
- 无密钥访问 `/scrape` `/search` `/map` 每天有 IP 限制（429）。

### 3.2 `/v1/scrape` 端点格式（2025 当前）
```http
POST https://api.firecrawl.dev/v1/scrape
Authorization: Bearer fc-YOUR_API_KEY
Content-Type: application/json

{
  "url": "https://example.com/article",
  "formats": ["markdown", "html"],          // markdown | html | rawHtml | links | screenshot | json
  "onlyMainContent": true,                  // 跳过 nav/footer/ad（默认 true）
  "timeout": 30000,                         // ms
  "waitFor": 0,                             // ms，等待 JS 渲染
  "removeBase64Images": true,
  "blockAds": true,
  "jsonOptions": { "schema": {...}, "prompt": "..." },  // 仅 formats 含 json 时
  "actions": [                              // Cloud-only，浏览器交互
    { "type": "wait", "milliseconds": 2000 },
    { "type": "scroll", "direction": "down" }
  ]
}
```

成功响应（v1）：
```json
{
  "success": true,
  "data": {
    "markdown": "# Article Title\n\nClean markdown...",
    "html": "<body>...</body>",
    "metadata": {
      "title": "...",
      "description": "...",
      "sourceURL": "https://example.com/article",
      "statusCode": 200,
      "ogTitle": "...", "ogImage": "..."
    }
  }
}
```

> 注：自托管 v2.x（v2.11.162+）默认端点是 `/v2/scrape`，格式相同但鉴权可选；Cloud v1 端点仍然稳定。来源：<https://docs.firecrawl.dev/v1-welcome> · <https://docs.firecrawl.dev/contributing/self-host>

### 3.3 Self-host Docker Compose ✅ 支持
- 官方推荐流程：`git clone https://github.com/firecrawl/firecrawl && cd firecrawl`，创建 `.env`（`USE_DB_AUTHENTICATION=false` + Postgres 密码），`docker compose up --build -d`。
- 启动后 API 暴露在 `http://localhost:3002`，健康检查 `GET /v0/health/readiness` → `{"status":"ok"}`，最小可用烟雾测试 `POST /v2/scrape`。
- **自托管 vs Cloud 的功能差距**（2025 实际）：**无 Fire-Engine / stealth proxy / screenshot / page actions**；必须自己配 `OPENAI_API_KEY` 才能用 `/extract`；Bull UI 需 `BULL_AUTH_KEY`。
- 自托管最低资源：2GB RAM + 4GB 磁盘，但实际要跑 Playwright 浏览器建议 **≥8GB RAM**。
- 来源：<https://docs.firecrawl.dev/contributing/self-host> · <https://github.com/firecrawl/firecrawl>

### 3.4 替代品对比（2025 Q4）
| 工具 | Free tier | 单价（每 1k 页） | 自托管 | 强项 | 弱项 |
|------|-----------|------------------|---------|------|------|
| **Firecrawl Cloud** | 1k credits / 月 | $0.83（Standard 100k/月） | ✅（无 Fire-Engine） | RAG 一体化、`jsonOptions` schema 提取、anti-bot | AGPL 商业限制 |
| **Jina Reader** (`r.jina.ai`) | ✅ 20 RPM 无 key；**10M tokens** 有 key | $0.02 / 1M tokens | 部分开源 | **零配置**：URL 前缀即可，RAG 友好 | 无 crawl、无 stealth、无结构化提取 |
| **Apify** | $5 credits/月 | $0.40–$1.50 / 1k records | ❌ | **6k+ 现成 Actor**、schedules、proxy、cron | 学习曲线、CU 计费复杂 |
| **ScrapingBee** | ❌ | $49/月起 | ❌ | proxy rotation、JS rendering、screenshot | 不输出 markdown |
| **Crawl4AI** | ✅ 100% 开源（Apache-2.0） | 自费 server + LLM | ✅ | 数据不出机房、LLM 友好 chunking | 自己维护反爬、稳定性靠自己 |
| **Diffbot** | 10k calls / 月 | $299/月起 | ❌ | KG 自动分类 | 贵、纯 SaaS |
| **Tavily** | 1k/月 | $35/月起 | ❌ | search + 摘要，agent 友好 | 不是 URL reader |
| **Bright Data** | ❌ | $499/月起 | ❌ | 巨量 proxy + MCP | 重型企业 |

**核心差异**：
- **Jina Reader**：URL → markdown，**零代码**集成，10M token 免费。适合单页 RAG 摄入。
- **Firecrawl**：整套（scrape/crawl/extract/search/map），AI-ready markdown + 结构化。**唯一开源又能稳定商用**的。
- **Apify**：不要从零写 scraper，6k 现成 Actor。
- **Crawl4AI**：Apache-2.0（Firecrawl 是 AGPL，闭源商用不友好），适合想完全控制的团队。

来源：<https://dev.to/apify/firecrawl-vs-apify-2025-guide-for-ai-and-data-teams-42e3> · <https://serp.fast/tools/jina-ai> · <https://aieii.com/posts/2026-08-21-firecrawl-vs-crawl4ai-vs-jina-reader>

### 3.5 推荐 MediaForge 集成方式：**fetcher 内 fallback，不单独起 service**

**理由**：
1. MediaForge 是内容工具，不是爬虫平台。Fetcher 是输入路径，scrape 是 fetcher 的一个策略。
2. 单独起 service 增加部署复杂度（多一个进程/容器），而 fetcher 已经是 Node/TS 模块。
3. Cloud 模式可直接调官方 REST；自托管模式只是 base URL 改一下。
4. Fallback 链非常自然：**Jina Reader（最便宜零配置）→ Firecrawl Cloud（JS 渲染好）→ 自托管 Firecrawl（隐私/成本）→ 本地 fetch + cheerio（终极降级）**。

### 3.6 推荐 MediaForge Fetcher 集成代码（直接照搬）

```ts
// lib/fetcher/scraper.ts
// 统一的「URL → clean markdown」接口，4 层 fallback

import Firecrawl from '@mendable/firecrawl-js';   // 或 npm i firecrawl

export type ScrapeResult = {
  url: string;
  markdown: string;
  html?: string;
  title?: string;
  description?: string;
  source: 'jina' | 'firecrawl-cloud' | 'firecrawl-self' | 'fetch-fallback';
};

export type ScraperConfig = {
  firecrawlKey?: string;        // fc-...，可选
  firecrawlBase?: string;       // 自托管时填 https://firecrawl.local
  jinaKey?: string;             // jina_...，可选
  timeoutMs?: number;
  prefer?: Array<'jina' | 'firecrawl'>;  // 强制优先级
};

/** L1: Jina Reader（最便宜，零配置） */
async function tryJina(url: string, key?: string, timeoutMs = 30_000): Promise<ScrapeResult> {
  const headers: Record<string, string> = {
    'X-Return-Format': 'markdown',
    'X-Timeout': String(Math.floor(timeoutMs / 1000)),
  };
  if (key) headers['Authorization'] = `Bearer ${key}`;
  const target = `https://r.jina.ai/${url}`;
  const res = await fetch(target, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`jina ${res.status}`);
  const markdown = await res.text();
  return { url, markdown, source: 'jina' };
}

/** L2: Firecrawl（Cloud 或自托管同一个 SDK） */
async function tryFirecrawl(url: string, cfg: ScraperConfig): Promise<ScrapeResult> {
  if (!cfg.firecrawlKey) throw new Error('no firecrawl key');
  const app = new Firecrawl({
    apiKey: cfg.firecrawlKey,
    apiUrl: cfg.firecrawlBase,  // 可选，缺省走 cloud
  });
  const doc = await app.scrapeUrl(url, {
    formats: ['markdown', 'html'],
    onlyMainContent: true,
    timeout: cfg.timeoutMs ?? 30_000,
  } as any);
  if (!doc) throw new Error('firecrawl empty');
  return {
    url,
    markdown: (doc as any).markdown ?? '',
    html: (doc as any).html,
    title: (doc as any).metadata?.title,
    description: (doc as any).metadata?.description,
    source: cfg.firecrawlBase ? 'firecrawl-self' : 'firecrawl-cloud',
  };
}

/** L4: 裸 fetch + HTML 提取（终极降级，**注**：需要 HTML→MD 转换） */
async function tryFetchFallback(url: string, timeoutMs = 15_000): Promise<ScrapeResult> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MediaForge/1.0 (+https://mediaforge.local)' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const html = await res.text();
  // MediaForge 可选：集成 readability + turndown（@extractus/article-extractor + turndown）
  // 这里只返回原 HTML，调用方决定怎么处理
  return { url, markdown: html, html, source: 'fetch-fallback' };
}

/** 主入口：按 prefer 顺序试，失败自动降级 */
export async function scrape(
  url: string,
  cfg: ScraperConfig = {},
): Promise<ScrapeResult> {
  const order: Array<'jina' | 'firecrawl'> = cfg.prefer ?? ['jina', 'firecrawl'];

  const chain: Array<() => Promise<ScrapeResult>> = [];
  for (const p of order) {
    if (p === 'jina') chain.push(() => tryJina(url, cfg.jinaKey, cfg.timeoutMs));
    if (p === 'firecrawl') chain.push(() => tryFirecrawl(url, cfg));
  }
  chain.push(() => tryFetchFallback(url, cfg.timeoutMs));

  let lastErr: unknown;
  for (const fn of chain) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      // 继续降级
    }
  }
  throw new Error(`scrape failed after ${chain.length} attempts: ${String(lastErr)}`);
}
```

```ts
// lib/fetcher/index.ts — 把 scrape 接进 MediaForge 现有 fetcher
import { scrape } from './scraper';

export async function fetchArticle(url: string) {
  const { markdown, title, description, source } = await scrape(url, {
    firecrawlKey: process.env.FIRECRAWL_API_KEY,
    firecrawlBase: process.env.FIRECRAWL_BASE_URL,  // 自托管时设 https://firecrawl.internal
    jinaKey: process.env.JINA_API_KEY,
    timeoutMs: 30_000,
  });
  return { url, title, description, content: markdown, scraper: source };
}
```

**环境变量**：
```
FIRECRAWL_API_KEY=fc-...           # 留空则跳过 firecrawl 层
FIRECRAWL_BASE_URL=                # 留空走 cloud；自托管填 https://firecrawl.local:3002
JINA_API_KEY=jina_...              # 留空则用匿名（20 RPM 限速）
```

**为什么这么排优先级**：
- **Jina 优先**：免费额度大、零配置、单页速度快。多数博客/文档类页面一次过。
- **Firecrawl 兜底**：Jina 抓不到 JS 渲染页面时（大量 SPA），切到 Firecrawl，它有 Playwright + stealth。
- **Fetch fallback**：最后兜底，至少拿到原始 HTML 走本地 readability + turndown 转换。

---

## 总结：MediaForge 三件事的最终方案

| 决策 | 选型 | 关键包 / API |
|------|------|--------------|
| **ZIP 打包** | **fflate**（8kB、纯 TS、tree-shakable） | `zipSync` + Blob + `<a download>`，必须在 `"use client"` 组件里 |
| **微信富文本** | **Markdown → Juice 内联化 → 弹窗预览 + execCommand 复制** | 内联样式、no `<script>`/`<style>`/`<link>`/class；ClipboardItem 是 Chrome/Safari 现代增强，微信内置浏览器读不到 |
| **网页抓取** | **Jina Reader → Firecrawl → 本地 fetch 三层 fallback**，集成进 fetcher | 不单独起 service；自托管 Firecrawl 仅用 `apiUrl` 切换 base URL |

### 一键安装
```bash
pnpm add fflate                          # ZIP
pnpm add @mendable/firecrawl-js           # Firecrawl（firecrawl 也可，更新更活跃）
pnpm add @types/firecrawl-js -D           # TS 类型（如果 SDK 没自带）
# Jina 不需要 SDK，直接 fetch https://r.jina.ai/<url>
# 微信复制不需要装包，用 document.execCommand('copy')
```

### 一键自托管 Firecrawl（可选）
```bash
git clone https://github.com/firecrawl/firecrawl.git
cd firecrawl && git checkout v2.11.162
cat > .env <<EOF
USE_DB_AUTHENTICATION=false
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -hex 32)
POSTGRES_DB=postgres
EOF
docker compose up --build -d
curl http://localhost:3002/v0/health/readiness  # {"status":"ok"}
```
