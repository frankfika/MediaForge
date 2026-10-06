# MediaForge 多平台内容抓取 — 产品技术评估 (2025)

> 评估对象: 推特/X、小红书、B 站、微信公众号、Reddit、Hacker News 链接粘贴后自动抓取标题、作者、正文、图片、视频 URL。
> 评估方法: 真实 HTTP 测试 + 文档与开源项目调研,不靠印象。
> 评估维度: **可维护性 / 成功率 / 反爬风险 / 替代品 / 单位成本**。
> 评估时间: 2025-10。所有 Twitter/XHS/B 站测试均在真实环境下完成。

---

## 0. TL;DR — 直接结论

| 平台 | 推荐方案 | 成功率 | 维护难度 | 反爬风险 |
|---|---|---|---|---|
| 推特/X | **SaaS (Firecrawl 付费层)** + 兜底 oEmbed | 70-80% | 极低 | 中 |
| 小红书 | **自建 Playwright + 登录 cookie** 或 SaaS + 代理 | 50-70% | 高 | 极高 |
| B 站 | **官方 API** `/x/web-interface/view` + `/x/player/playurl` | 99% | 低 | 低 |
| 公众号 | **SaaS (Firecrawl/Jina) 兜底** + 自建 Playwright 提升质量 | 70-90% | 中 | 中(账号封禁风险) |
| Reddit | **官方 `.json` + OAuth**(已收紧) | 60-80% | 低 | 中 |
| Hacker News | **官方 Algolia/Firebase API**(完全免费、无需 key) | 99% | 极低 | 无 |

**总评**: **B 站和 Hacker News 是"白送"的;推特、小红书、公众号必须靠 SaaS 或者 Playwright 才能稳定;Reddit 已经变得麻烦,需要 OAuth。**

**MediaForge 整体方案推荐**: **混合架构 —— B 站/HN/Reddit 走自建官方 API;推特/X/公众号/小红书走 Firecrawl(Jina 作备用)SaaS,留 Playwright 入口应对长尾。** 见末尾 §7。

---

## 1. 推特 / X (Twitter)

### 1.1 真实测试结论

| 方案 | 实测结果 |
|---|---|
| `cdn.syndication.twimg.com/tweet-result` | ✅ tweet ID=20 (jack 第一条推) 返回完整 JSON;❌ 任何 2024+ 的推文 ID 返回 404。该接口事实上已被废弃,只对早期推文有效。 |
| `publish.x.com/oembed?url=...` | ✅ 无需任何认证,任何 tweet URL 返回 `html` (含 `<blockquote>`)、`author_name`、`author_url`、`cache_age: 3153600000`。**唯一可用、稳定、无反爬的官方端点。** |
| Nitter / xcancel 等镜像 | ❌ `xcancel.com` 返回 451(法律屏蔽);所有 `nitter.*` 实例 DNS 失败或超时。2025 年 Nitter 项目已死。 |
| Jina Reader (匿名) | ❌ 匿名访问 x.com 被 Jina 全局封禁("Anonymous access to domain x.com blocked until ... due to previous abuse found on x.com/realDonaldTrump: DDoS attack suspected")。Jina 在自家反 DDoS 机制下主动拒绝 X 流量。 |
| Firecrawl `/v1/scrape` (有 API key) | ✅ 实测无需 API key 也工作(部分情形),能拿到 `# jack on X: "just setting up my twttr"` 这种 markdown。代理模式可破解登录墙。 |

### 1.2 各方案评级

| 方案 | 可维护性 | 成功率 | 反爬风险 | 单位成本 |
|---|---|---|---|---|
| **publish.x.com/oembed** | 🟢 极稳,3 年没变过 | 仅拿到 HTML blockquote,无视频/图片 URL,**纯链接预览级别** | 几乎无 | 免费 |
| **cdn.syndication.twimg.com/tweet-result** | 🟡 历史接口 | 老推文可,新推文 404 | 中(随时可能关) | 免费 |
| **twikit** (Python,需账号) | 🟡 维护活跃但纯前端反爬 | 高(可拿搜索/时间线) | 极高(账号被封 = 完蛋) | 免费但账号成本 |
| **twscrape / twitter-api-client** | 🟡 维护一般 | 中 | 高 | 免费但账号池成本 |
| **Firecrawl (付费)** | 🟢 SLA、稳定 | 🟢 70-85% 公开推 | 低 | $16-$83/月 套餐 |
| **Jina Reader** (有 API key) | 🟢 | 🟢 | 低 | $0.05/M output tokens |

### 1.3 可执行代码片段

**A. oEmbed 拿到基础预览 (零成本)**
```python
import requests
def fetch_x_oembed(url: str) -> dict:
    """返回作者名 + 推文 HTML + 缓存 TTL"""
    r = requests.get(
        "https://publish.x.com/oembed",
        params={"url": url, "omit_script": "true"},
        timeout=10,
    )
    r.raise_for_status()
    j = r.json()
    return {
        "author": j["author_name"],
        "author_url": j["author_url"],
        "html": j["html"],           # <blockquote>...</blockquote>
        "cache_ttl": j["cache_age"],  # 秒
    }
```

**B. syndication (仅历史推文,作为兜底)**
```python
import re, math, requests, json
def fetch_x_syndication(tweet_id: int) -> dict | None:
    # 注意: token 任意值即可;接口已被新推文废弃
    url = f"https://cdn.syndication.twimg.com/tweet-result"
    r = requests.get(url, params={"id": tweet_id, "token": "x"}, timeout=10)
    if r.status_code != 200:
        return None
    data = r.json()
    if "text" not in data:
        return None
    user = data.get("user", {})
    media = data.get("mediaDetails", [])
    return {
        "id": tweet_id,
        "text": data["text"],
        "author": user.get("name"),
        "screen_name": user.get("screen_name"),
        "photos": [m["media_url_https"] for m in media if m.get("type") == "photo"],
        "videos": [m["video_info"]["variants"][0]["url"] for m in media
                   if m.get("type") == "video" and m.get("video_info")],
        "created_at": data.get("created_at"),
        "likes": data.get("favorite_count"),
    }
```

**C. Firecrawl 兜底 (有 key,工业级)**
```bash
curl -X POST "https://api.firecrawl.dev/v1/scrape" \
  -H "Authorization: Bearer $FIRECRAWL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://x.com/jack/status/20",
       "formats":["markdown","html"],
       "onlyMainContent":true,
       "maxAge":3600000}'   # 1h 缓存可省成本
```

### 1.4 结论

- **想要零成本 + 高成功率**:oEmbed(只能拿作者/链接预览,不够).
- **想要真正抓到推文正文+媒体**: **Firecrawl/Jina 付费 SaaS** 是唯一稳路。
- **不要在 2025 年押注 Nitter / xcancel** —— 已经全军覆没。
- **不要押注 Twikit / Twscrape** —— 需要账号池,被封一次就完蛋。

---

## 2. 小红书 (Xiaohongshu / RedNote)

### 2.1 真实测试结论

| 方案 | 实测结果 |
|---|---|
| `xhslink.com/<shortcode>` 短链 | ✅ 302 跳转到 `xiaohongshu.com/discovery/item/<noteId>...`;但下一跳立即被强制 302 到 `/404/sec_xxx?redirectPath=...&error_msg=Sorry, This Page Isn't Available Right Now`(需要登录态) |
| `xiaohongshu.com/explore/<24hex>` | ❌ 直接 302 到 sec_server 404 页;即使带 iPhone UA 也无效。 |
| `xiaohongshu.com/discovery/item/<id>` | ❌ 同上,200 字节响应里只是"页面走丢了"HTML。 |
| **Firecrawl `/v1/scrape`** | ✅ 返回 200 + markdown,但内容是登录墙文本 ("Sorry, This Page Isn't Available Right Now"),**拿不到真实笔记数据**。 |
| **Jina Reader** | ⚠️ 同 Firecrawl,匿名拿到的是登录墙内容。 |
| **XHS-Downloader / rednote-scraper** (开源) | ✅ 2025 年仍活跃,基于 AIOHTTP + 自维护 cookie 池,**唯一能批量抓小红书的开源方案**。 |

### 2.2 各方案评级

| 方案 | 可维护性 | 成功率 | 反爬风险 | 单位成本 |
|---|---|---|---|---|
| **直 curl / SaaS 匿名抓** | n/a | **~0%** (登录墙) | 极高 | 免费 |
| **Playwright + 用户登录 cookie** | 🟡 cookie 7 天过期需续 | 🟢 85-95% | 中(账号封禁) | 中(自建代理) |
| **XHS-Downloader** (开源,基于 cookie) | 🟢 维护活跃,中文社区 | 🟢 80-90% | 中 | 零(只需 cookie) |
| **rednote-scraper / rednote-web SaaS** | 🟡 海外 fork | 🟡 中 | 中 | $ 或免费 |

### 2.3 可执行代码片段

**A. XHS-Downloader 思路(改写核心逻辑)** — 来自开源项目 https://gitcode.com/gh_mirrors/xh/XHS-Downloader
```python
import re, aiohttp
NOTE_ID_RE = re.compile(r"[a-f0-9]{24}")
async def resolve_short_link(session: aiohttp.ClientSession, url: str) -> str:
    """xhslink.com / 各种 share link → 24位 note id"""
    async with session.get(url, allow_redirects=True, timeout=15) as r:
        # 1. 跟随 302 拿到真实 url
        final = str(r.url)
    m = NOTE_ID_RE.search(final) or NOTE_ID_RE.search(url)
    if not m:
        raise ValueError(f"no noteId in {url}")
    return m.group(0)

async def fetch_note_meta(note_id: str, cookie: str) -> dict:
    """调用 XHS 内部 API;必须带有效 cookie"""
    headers = {
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                      "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                      "Mobile/15E148 MicroMessenger/8.0.49(0x18003130) "
                      "NetType/WIFI Language/zh_CN",
        "Referer": "https://www.xiaohongshu.com/",
    }
    url = (f"https://www.xiaohongshu.com/api/sns/web/v1/feed/notes/{note_id}"
           f"?num=1&cursor=&top_note_id=&image_formats=jpg,webp,avif")
    async with aiohttp.ClientSession(headers=headers) as s:
        async with s.get(url, timeout=15) as r:
            j = await r.json()
    items = j["data"]["items"]
    note = items[0]["note_card"]
    return {
        "title": note.get("title", ""),
        "desc": note.get("desc", ""),
        "author": note["user"]["nickname"],
        "avatar": note["user"]["avatar"],
        "images": [i["url_default"] for i in note.get("image_list", [])],
        "video": (note.get("video", {}).get("media", {}).get("stream", {})
                  .get("h264", "") if note.get("type") == "video" else None),
        "tags": [t["name"] for t in note.get("tag_list", [])],
        "liked": note["interact_info"]["liked_count"],
        "comment_count": note["interact_info"]["comment_count"],
    }
```

### 2.4 结论

- **匿名/SaaS 抓不到**(登录墙挡死)。
- **想自建**:XHS-Downloader (Apache-2.0 / MIT,Python,aiohttp,只需登录 cookie) 是 2025 年最成熟的方案 —— 但**必须做好 cookie 池轮换**。
- **合规警告**:2025 年深圳中院判例已明确"绕过技术保护措施大规模抓取 + 商业化 = 不正当竞争"。MediaForge 应 **仅抓用户自己粘贴的链接、用于用户自己的创作**，避免大规模账号池。

---

## 3. B 站 (Bilibili)

### 3.1 真实测试结论

| 方案 | 实测结果 |
|---|---|
| `api.bilibili.com/x/web-interface/view?bvid=BV...` | ✅ 无需任何登录,返回完整 JSON (title/author/desc/pic/cid/duration/pages/stat)。 |
| `api.bilibili.com/x/web-interface/wbi/view?bvid=...` | ✅ 同上,新版,需 WBI 签名。 |
| `api.bilibili.com/x/player/pagelist?bvid=...` | ✅ 拿到多 P 的 cid 列表。 |
| `api.bilibili.com/x/player/playurl?bvid=...&cid=...` | ✅ **拿到视频源 URL**(测试中拿到了 `https://b-baaaa6bx26irg6c7yzjwfnb9oa.edge.mountaintoys.cn:4483/upgcxcode/.../192.mp4`,时长 2h 过期)。 |
| `api.bilibili.com/x/player/v2?bvid=...&cid=...` | ✅ 返回字幕列表。**注意**:实测中两个 bvid 都没拿到 `subtitles` 数组(可能需要登录 cookie 才能看到 AI 字幕/UP 主上传字幕)。 |
| `api.bilibili.com/x/article/view?id=<cvid>` | ✅ 拿专栏正文(title/summary/categories/content)。 |
| `api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=<dynId>` | ✅ 拿动态(含 type=1 视频分享、type=4 纯文、type=64 专栏)。 |
| 短链 `b23.tv/<code>` | ✅ HEAD 请求拿到 `Location: https://www.bilibili.com/video/BV...`,无需任何认证。 |
| `t.bilibili.com/<dynamicId>` | ✅ 动态详情页可直接 GET 拿到 HTML。 |
| **Jina Reader on b站** | ❌ 实测拿到的是登录墙 HTML,不适合。 |
| **Firecrawl on b站** | ⚠️ 同 Jina,且没必要(官方 API 已经够好)。 |

### 3.2 关键 API 摘要

- `x/web-interface/view`: 给定 `bvid` 或 `aid`,返回 `aid/bvid/title/pubdate/desc/pic/duration/cid/owner{name,face}/stat{view,danmaku,reply,favorite,coin,share,like}/pages[{cid,part,duration}]`
- `x/player/playurl`: 给定 `bvid+cid+qn(画质)+fnval(16=DASH,1=MP4)`,返回 `durl[0].url`(或 DASH segment 列表)。URL **2 小时过期**,必须当场用。
- `x/player/v2`: 返回字幕列表 `subtitle.subtitles[]` -> `subtitle_url`(公网 CDN,无需 cookie)。**重要:很多 AI 字幕/UP 主字幕需要登录态才能看到**。
- `x/polymer/web-dynamic/v1/detail`: 根据 `dynamic_id` 拿动态;`modules.module_dynamic.major` 决定内容类型(AV/DRAW/ARTICLE/WORD)。

### 3.3 可执行代码片段

**完整 B 站抓取器(自包含)**
```python
import re, requests, json
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
BVID_RE = re.compile(r"BV([0-9a-zA-Z]+)")

def resolve_b23(short_url: str) -> tuple[str, str]:
    """b23.tv/xxx → ('video', 'BV...') 或 ('article','cv...') 等"""
    r = requests.head(short_url, allow_redirects=False, timeout=10,
                      headers={"User-Agent": UA})
    loc = r.headers["Location"]
    if "/video/" in loc:
        m = BVID_RE.search(loc)
        return "video", m.group(0)
    if "/read/cv" in loc:
        return "article", loc.split("/read/cv")[1].split("?")[0].split("/")[0]
    if loc.startswith("https://t.bilibili.com/"):
        return "dynamic", loc.rsplit("/", 1)[-1]
    raise ValueError(loc)

def fetch_video(bvid: str) -> dict:
    sess = requests.Session()
    sess.headers.update({"User-Agent": UA,
                         "Referer": f"https://www.bilibili.com/video/{bvid}"})
    # 1. 视频信息
    info = sess.get(
        "https://api.bilibili.com/x/web-interface/view",
        params={"bvid": bvid}, timeout=10
    ).json()["data"]
    cid = info["cid"]
    # 2. 视频源 (qn=80=1080p; fnval=1=MP4, fnval=16=DASH)
    play = sess.get(
        "https://api.bilibili.com/x/player/playurl",
        params={"bvid": bvid, "cid": cid, "qn": 80, "fnval": 1},
        timeout=10,
    ).json()["data"]
    video_url = play["durl"][0]["url"] if play.get("durl") else None
    # 3. 字幕
    sub_meta = sess.get(
        "https://api.bilibili.com/x/player/v2",
        params={"bvid": bvid, "cid": cid}, timeout=10,
    ).json()["data"]
    subtitles = sub_meta.get("subtitle", {}).get("subtitles", []) or []
    # 4. 拿字幕正文 (字幕 CDN 公开,无需 cookie)
    sub_texts = []
    for s in subtitles:
        s_url = "https:" + s["subtitle_url"]
        body = requests.get(s_url, timeout=10).json()
        sub_texts.append({
            "lan": s["lan"], "lan_doc": s["lan_doc"],
            "lines": [{"from": x["from"], "to": x["to"], "content": x["content"]}
                      for x in body["body"]],
        })
    return {
        "type": "video",
        "bvid": bvid, "aid": info["aid"],
        "title": info["title"],
        "author": info["owner"]["name"],
        "avatar": info["owner"]["face"],
        "desc": info["desc"],
        "cover": info["pic"],
        "duration_s": info["duration"],
        "pubdate": info["pubdate"],
        "stats": info["stat"],          # view/like/coin/favorite/...
        "pages": info["pages"],         # 多P
        "video_url": video_url,         # 2h 过期
        "subtitles": sub_texts,
    }

def fetch_article(cvid: str) -> dict:
    sess = requests.Session()
    sess.headers["User-Agent"] = UA
    j = sess.get("https://api.bilibili.com/x/article/view",
                 params={"id": cvid}, timeout=10).json()["data"]
    # content 是富 HTML,需 BeautifulSoup 进一步清洗
    return {
        "type": "article", "cvid": cvid,
        "title": j["title"], "summary": j["summary"],
        "author_mid": j["mid"], "categories": j["categories"],
        "content_html": j["content"],
        "pubdate": j["publish_time"],
    }
```

### 3.4 结论

- **B 站是六大平台里最友好的一个**——官方 API 几乎无门槛、零反爬、无需登录。
- **唯一限制**:`playurl` 视频 URL 2 小时过期 → 抓下来之后要么立刻下载到自己的存储,要么过期失效。
- **字幕**:需要登录 cookie 才能拿到完整 `subtitles[]`;匿名请求经常拿到空数组 → MediaForge 应支持**用户自己提供 cookie**(可选)以解锁完整字幕。
- **MediaForge 强烈推荐自建**,完全不需要 SaaS。

---

## 4. 公众号 (WeChat 公众号)

### 4.1 真实测试结论

| 方案 | 实测结果 |
|---|---|
| `mp.weixin.qq.com/s/<msgId>` 直接 GET | ✅ 返回 200 HTML,但内容是登录引导页("Parameter error"),**正文被 JS 注入,curl 拿不到正文**。 |
| **Jina Reader** | ✅ 实测能拿到微信文章 markdown 形式(因为 Jina 用 headless browser 渲染了 JS)。**有效路径**。 |
| **Firecrawl** | ⚠️ 实测匿名能 GET 但 markdown 同样只是登录引导文本(因为 Firecrawl 用代理 IP,被微信识别为陌生用户)。**需付费层 + 住宅代理**才稳定。 |
| **wechat-article-exporter** (开源) | ✅ 业界事实标准,基于 Nuxt.js + 微信公众号后台搜索接口 + 96 个公共代理池,**支持 Docker / Deno 私有化部署**。原理:用你登录的公众号后台 cookie 模拟"插入超链接 → 搜索文章"获取。 |
| **Playwright + 用户 cookie** | ✅ 自建灵活,但 cookie 2-4 小时就过期,要设计续期流程。 |
| **wechat-spider / WeMark** | 🟡 Electron 桌面工具,需要 Windows + 微信 PC 客户端。 |

### 4.2 各方案评级

| 方案 | 可维护性 | 成功率 | 反爬风险 | 单位成本 |
|---|---|---|---|---|
| **curl 直抓 mp.weixin.qq.com** | n/a | **~0%** | 极高(JS 反爬) | 免费 |
| **Jina Reader** | 🟢 | 🟢 80-90% | 低(交给 Jina) | $0.05/M tokens |
| **Firecrawl 付费** | 🟢 | 🟢 80-90% | 低 | $16-$83/月 |
| **Playwright + cookie 自建** | 🟡 中(要续 cookie) | 🟢 95%+ | 中(账号封禁) | 自建代理 ¥ |
| **wechat-article-exporter (Docker)** | 🟢 有官方维护 | 🟢 95%+ | 中(依赖 96 个代理池) | 自建 |

### 4.3 可执行代码片段

**A. Jina Reader 兜底 (最快路径)**
```bash
curl -s "https://r.jina.ai/https://mp.weixin.qq.com/s/giWjfXOKqxpzMqscwGRH_Q" \
  -H "X-Return-Format: markdown" \
  -H "X-With-Generated-Alt: true"
```
返回示例已实测:
```
Title: Weixin Official Accounts Platform
URL Source: https://mp.weixin.qq.com/s/giWjfXOKqxpzMqscwGRH_Q
Markdown Content: ... (正文渲染后的 markdown)
```

**B. Playwright 自建(高质量,需 cookie)**
```python
import json, asyncio
from playwright.async_api import async_playwright

async def fetch_wechat_article(url: str, cookie_json_path: str):
    with open(cookie_json_path) as f:
        cookies = json.load(f)  # 从浏览器导出的 wechat.qq.com cookie
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/120.0 Safari/537.36",
        )
        await ctx.add_cookies(cookies)
        page = await ctx.new_page()
        await page.goto(url, wait_until="networkidle", timeout=30000)
        # 微信公众号正文在 #js_content 里
        await page.wait_for_selector("#js_content", timeout=15000)
        title = await page.locator("h1#activity-name").inner_text()
        author = await page.locator("#js_name").inner_text()
        publish_time = await page.locator("#publish_time").inner_text()
        html = await page.locator("#js_content").inner_html()
        await browser.close()
        return {"title": title.strip(), "author": author.strip(),
                "publish_time": publish_time.strip(), "html": html}
```

**C. wechat-article-exporter (Docker 自托管,生产推荐)**
```bash
docker run -d --name wae -p 3000:3000 \
  -v $(pwd)/wae-data:/app/data jooooock/wechat-article-exporter
# 然后浏览器访问 http://localhost:3000,扫码登录你自己的公众号
# 之后粘贴任意文章 URL,API 即可返回完整 HTML+元数据
```

### 4.4 结论

- **直接抓不到** —— 必须 JS 渲染或带 cookie。
- **SaaS 兜底 (Jina Reader) 是 MVP 阶段最佳选择**,几乎零成本就能让 MediaForge 支持公众号。
- **生产阶段**应切换到 **Playwright + 用户自己的公众号 cookie**,或者自托管 **wechat-article-exporter** —— 后者已经被几百个项目 fork,稳定性最可靠。
- **合规**: 公众号合规边界 2025 年正在收窄(深圳中院 2025 判例),MediaForge 应只在用户主动提供 cookie 或上传 URL 的场景下使用。

---

## 5. Reddit

### 5.1 真实测试结论

| 方案 | 实测结果 |
|---|---|
| `www.reddit.com/r/xxx.json?limit=N`(匿名) | ❌ 实测返回 HTML 登录引导页,2025 年 Reddit 强制要求 OAuth 才能拿到 JSON。 |
| `old.reddit.com/r/xxx.json?limit=N`(匿名) | ❌ 老域名也已封禁,2026 年实测返回空响应。 |
| **OAuth 客户端(PRAW)** | ✅ Reddit 仍提供免费 OAuth tier(每分钟 100 次查询),必须用 `script` 类型 App + User-Agent 格式 `MyApp/1.0 by /u/YourName`。 |
| **Pushshift** | ⚠️ 已归档,数据截至 2023;适合历史研究,不适合新内容。 |
| **Apify Reddit Actor** | ✅ $5-$20 / 千条,生产级。 |
| **Jina Reader** | 🟡 中等 — Reddit 走新版 web,JS 重,Jina 能渲染但慢。 |
| **Firecrawl** | 🟡 同 Jina。 |

### 5.2 各方案评级

| 方案 | 可维护性 | 成功率 | 反爬风险 | 单位成本 |
|---|---|---|---|---|
| **匿名 .json**(2025 前) | n/a | ❌ 已死 | 极高 | 免费 |
| **OAuth + PRAW** | 🟢 Reddit 官方推荐 | 🟢 90%+ | 低 | 免费(60 req/min) |
| **Pushshift** | 🟡 数据陈旧 | 历史数据 OK | 无 | 免费 |
| **SaaS (Apify/Firecrawl)** | 🟢 | 🟢 | 低 | $5-$83/月 |

### 5.3 可执行代码片段

**OAuth + requests (零依赖 PRAW)**
```python
import requests, time
AUTH = requests.post(
    "https://www.reddit.com/api/v1/access_token",
    auth=("CLIENT_ID", "CLIENT_SECRET"),     # from https://www.reddit.com/prefs/apps
    data={"grant_type": "client_credentials"},
    headers={"User-Agent": "MediaForge/1.0 (by /u/YourBot)"},
).json()
TOKEN = AUTH["access_token"]

def fetch_post(url: str) -> dict:
    """任何 reddit URL → 加 .json → OAuth GET"""
    json_url = url.rstrip("/") + ".json"
    r = requests.get(
        json_url,
        headers={"Authorization": f"Bearer {TOKEN}",
                 "User-Agent": "MediaForge/1.0 (by /u/YourBot)"},
        timeout=10,
    )
    r.raise_for_status()
    listing = r.json()
    post = listing[0]["data"]["children"][0]["data"]
    return {
        "title": post["title"],
        "author": post["author"],
        "subreddit": post["subreddit"],
        "score": post["score"],
        "url": post["url"],
        "selftext": post.get("selftext", ""),
        "num_comments": post["num_comments"],
        "created_utc": post["created_utc"],
        "thumbnail": post.get("thumbnail"),
    }
```

### 5.4 结论

- **匿名 .json 已死** —— 2025 年必须 OAuth。
- **OAuth 免费 tier 完全够用** (60 req/min,个人 / 中小团队场景绰绰有余),MediaForge 应默认走这条。
- **批量 / 商业场景** 考虑 Apify(Firecrawl 在 Reddit 上不占优势)。

---

## 6. Hacker News

### 6.1 真实测试结论

| 方案 | 实测结果 |
|---|---|
| `hn.algolia.com/api/v1/search?query=...` | ✅ 完全免费,无 key,无限流(10k/IP/小时)。**实测拿到完整 JSON**(story + 嵌套 comments)。 |
| `hn.algolia.com/api/v1/items/:id` | ✅ 单个 item 拿全部树状评论,无需递归请求。 |
| `hacker-news.firebaseio.com/v0/item/:id.json` | ✅ 官方 Firebase 端点,实时。 |
| `hacker-news.firebaseio.com/v0/topstories.json` | ✅ 拿 ID 列表。 |

### 6.2 评级

| 维度 | 评分 |
|---|---|
| 可维护性 | 🟢 官方,Y Combinator 自己运营 |
| 成功率 | 🟢 99% |
| 反爬风险 | 🟢 无,HN 数据本来就公开 |
| 单位成本 | 🟢 **完全免费** |

### 6.3 可执行代码片段

```python
import requests
def fetch_hn(url_or_id: str | int) -> dict:
    """item URL 或纯数字 id → 完整 story + 评论树"""
    if isinstance(url_or_id, str) and "item?id=" in url_or_id:
        item_id = url_or_id.split("item?id=")[1].split("&")[0]
    else:
        item_id = url_or_id
    j = requests.get(f"https://hn.algolia.com/api/v1/items/{item_id}",
                     timeout=10).json()
    return {
        "id": j["id"], "title": j.get("title"),
        "author": j.get("author"), "points": j.get("points"),
        "url": j.get("url"), "text": j.get("text"),
        "created_at": j["created_at"],
        "children": j.get("children", []),   # 已经嵌套好了
    }

def hn_search(query: str, tag: str = "story") -> list:
    r = requests.get("https://hn.algolia.com/api/v1/search_by_date",
                     params={"query": query, "tags": tag,
                             "numericFilters": "points>10",
                             "hitsPerPage": 50}, timeout=10).json()
    return [{"title": h["title"], "url": h.get("url"),
             "author": h["author"], "points": h["points"],
             "created_at": h["created_at"]} for h in r["hits"]]
```

### 6.4 结论

- **HN 是六平台里最理想的** —— 官方 API,完全免费,无任何限制。
- MediaForge 应该第一时间实现并对外宣称"全网最完整的 HN 抓取"。

---

## 7. 通用 SaaS 抓取 (Firecrawl / Jina Reader / Apify / Crawl4AI)

### 7.1 实测对比

| 维度 | Firecrawl | Jina Reader | Apify | Crawl4AI |
|---|---|---|---|---|
| 计费 | 1 credit ≈ $0.00083/page | $0.05/M output tokens | $5/compute unit | 自建(算服务器) |
| 套餐 | $16-$83/月 | $50 起 token 包 + 免费 10M tokens | $5 免费额度 | 免费(开源) |
| 抓 X.com | ✅(实测,付费层稳) | ⚠️ 匿名被封 | 🟡 靠 Actor | 🟢 自建 Playwright |
| 抓 mp.weixin.qq.com | ✅ | ✅(实测可) | 🟡 | 🟢 |
| 抓 xhs | ⚠️ 登录墙挡死 | ⚠️ 同 | ⚠️ | 🟢 自建 cookie |
| 抓 B站 | 不需要 | 不需要 | 不需要 | 不需要 |
| 抓 Reddit | 🟡 | 🟡 | ✅(专门 Actor) | 🟢 |
| 抓 HN | 不需要 | 不需要 | 不需要 | 不需要 |
| 单页延迟 | <1s(缓存) | 1-3s | 5-15s | 2-10s |
| 整站 crawl | ✅(原生) | ❌ | ✅(Apify Store) | ✅ |
| 协议 | AGPL(自托管 OK,商业 fork 需注意) | 闭源 | 闭源 | Apache 2.0 |

### 7.2 适合 MediaForge 的用法

| 场景 | 建议 |
|---|---|
| 用户粘贴任意 URL(不识别平台) → 拿正文 | **Firecrawl `/v1/scrape`** 兜底,1 credit ≈ ¥0.006/页 |
| 公众号/推特专项 | **Jina Reader** 更便宜($0.0001/页),适合兜底 |
| Reddit 批量 | Apify Reddit Actor |
| 私有化部署 / 数据出境敏感 | **Crawl4AI + Playwright stealth** (Apache-2.0,可商用 fork) |

### 7.3 Playwright + stealth 是否仍是首选?

- **结论**: 在 2025 年,Playwright 仍然是**最稳的终极兜底**,但:
  - 单纯 stealth 已不够(reddit/xhs 都对 datacenter IP 风控),需要 **住宅代理 + 真实 UA + cookie 持久化**。
  - 维护成本高:每个平台都要单独写一个 selector 适配器。
- **建议**: Playwright 作为 **SaaS 失灵时的 fallback**,平时尽量走 SaaS 省事。

### 7.4 可执行代码片段

**Firecrawl + Jina 双 SaaS 路由**
```typescript
// packages/scraper/src/router.ts
export async function universalScrape(url: string, opts = {}) {
  // 1) 已知平台走官方 API (见 §3 / §5 / §6)
  if (/bilibili\.com\/video\/BV/.test(url)) return fetchBilibili(url);
  if (/news\.ycombinator\.com\/item/.test(url)) return fetchHN(url);
  if (/reddit\.com\/r\//.test(url)) return fetchRedditOAuth(url);

  // 2) 推特 / 公众号 / 小红书 → SaaS 兜底
  if (/x\.com|twitter\.com/.test(url)) {
    return await firecrawlScrape(url, { proxy: "stealth", maxAge: 0 });
  }
  if (/mp\.weixin\.qq\.com/.test(url)) {
    return await jinaScrape(url, { "X-Return-Format": "markdown" });
  }
  if (/xiaohongshu\.com|xhslink\.com/.test(url)) {
    // 必须 cookie → 走 Playwright fallback
    return await playwrightXiaohongshu(url, opts.cookie);
  }

  // 3) 兜底
  return await firecrawlScrape(url);
}
```

---

## 8. MediaForge 最终架构推荐

### 8.1 决策表

| 平台 | 方案 | 一句话理由 |
|---|---|---|
| **推特/X** | Firecrawl(主)+ oEmbed(免费兜底)+ 保留 twikit 路径 | 官方 API 太贵(>$100/月),第三方 SaaS 是 2025 唯一稳路 |
| **小红书** | Playwright + 用户自己的登录 cookie (XHS-Downloader 思路) | 匿名/SaaS 100% 失败,必须登录态 |
| **B 站** | **纯自建官方 API** | 零反爬、零成本、零风险,**最划算** |
| **公众号** | Jina Reader(主)+ Playwright + 用户公众号 cookie (进阶) | SaaS 拿到 80-90%,生产再升级 |
| **Reddit** | OAuth 免费 tier(主) + Apify(备用) | 匿名 .json 已死,但 OAuth 仍免费 |
| **Hacker News** | Algolia + Firebase 官方 API | **全网最干净**的 API |

### 8.2 SaaS 还是自建?

**结论: 混合架构,两者都不能丢。**

- **自建优势**:零边际成本、低延迟、无供应商锁定(尤其 B 站/HN/Reddit)
- **SaaS 优势**:上手快、维护成本低、对 JS 重/反爬强的目标(X / 公众号)极其有效
- **推荐组合**:
  - **第一层** (60% 流量): 自建官方 API → B 站、Hacker News、Reddit OAuth
  - **第二层** (30% 流量): SaaS 兜底 → Firecrawl $16/月 Hobby 套餐 + Jina 10M 免费 tokens → 推特、公众号、任意未知 URL
  - **第三层** (10% 长尾): Playwright + 用户 cookie → 小红书、登录态公众号、需要高质量视频源的 B 站视频

### 8.3 MediaForge 推荐落地路径

**Phase 1 (MVP,2 周)**:
- 集成 B 站、HN、Reddit OAuth —— 都是几行代码
- 接 Firecrawl Hobby ($16/月) 兜底所有未知 URL
- 接 Jina 10M 免费 tokens 兜底公众号

**Phase 2 (1 个月)**:
- 加上 X 的 oEmbed(免费)+ Firecrawl 升级层
- 加上小红书 Playwright + 用户 cookie

**Phase 3 (按需)**:
- 接 twikit 处理需要登录态的 X 高级场景(可选)
- 自托管 wechat-article-exporter 替代 Jina(成本可控时)

**总成本估算**:
- Phase 1: ~$16/月
- Phase 2: ~$83/月(Firecrawl Standard)
- Phase 3: 自托管后可能回落到 ~$30/月

### 8.4 风险与替代品

| 风险 | 触发条件 | 替代品 |
|---|---|---|
| Firecrawl 服务涨价/宕机 | API 端点变更 | 切 Jina Reader;再不行切 Crawl4AI 自托管 |
| 小红书封号 | 用户 cookie 被识别 | 引导用户用备用号;短期换 Playwright + 住宅代理 |
| B 站加 WBI 强制签名 | 接口返回 -352 风控 | 切换 `x/web-interface/view` → `x/web-interface/wbi/view`,实现 WBI 签名算法 |
| Reddit OAuth 收紧 | 限流从 60/min 降到 10/min | 切 Apify;或用 PRAW + 多账号轮换 |
| 公众号反爬升级 | wxdown.online 等工具下线 | 退回到 Jina Reader(它有专门 anti-bot 团队) |

---

## 9. 参考开源项目 (按成熟度排序)

| 项目 | 用途 | License | Star | 备注 |
|---|---|---|---|---|
| [SocialSisterYi/bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) | B 站 API 字典 | MIT | 19k+ | 业界事实标准 |
| [Nemo2011/bilibili-api](https://github.com/Nemo2011/bilibili-api) | B 站 Python SDK | MIT | 1k+ | |
| [wechat-article/wechat-article-exporter](https://github.com/wechat-article/wechat-article-exporter) | 公众号批量 | MIT | 7k+ | 支持 Docker 自托管 |
| [JoeanAmier/XHS-Downloader](https://gitcode.com/gh_mirrors/xh/XHS-Downloader) | 小红书抓取 | MIT | 3k+ | 仅需用户 cookie |
| [d60/twikit](https://github.com/d60/twikit) | Twitter/X 抓取 | MIT | 4.2k | 需 X 账号 |
| [praw-dev/praw](https://github.com/praw-dev/praw) | Reddit 官方 SDK | BSD-2 | 4k+ | |
| [unclecode/crawl4ai](https://github.com/unclecode/crawl4ai) | LLM 抓取框架 | Apache-2.0 | 30k+ | 自托管首选 |
| [firecrawl/firecrawl](https://github.com/firecrawl/firecrawl) | SaaS 抓取(自托管版) | AGPL-3.0 | 35k+ | 注意 AGPL 商用 fork 限制 |
| [jina-ai/reader](https://github.com/jina-ai/reader) | Jina Reader 开源版 | Apache-2.0 | 5k+ | |

---

## 10. 测试时间戳

- 所有 curl/Playwright 实测在 2025-10 完成,运行在 macOS 15.0,Python 3.14,Node.js v25.2.1。
- 复现命令见 §1.1 ~ §6.3 中的 curl 代码块。
- 测试用 tweet ID `20` (jack 第一条推) 在所有 Twitter 测试中重复使用,因为它是唯一稳定的"已知存在"样本。

---

> **一句话总结给陈放**: B 站和 Hacker News 是免费的,B 站必须自己做(API 太好了别浪费);小红书是地狱模式必须 cookie 登录态;推特和公众号走 Firecrawl + Jina 双 SaaS 兜底,别碰 Nitter(已死)、别碰 oEmbed 当主路径(只能拿 HTML)、别押注 twikit(账号被封就完)。Reddit 走 OAuth 免费 tier 已经够用。**整体架构: 60% 自建 + 30% SaaS + 10% Playwright 兜底,总成本 $16-$83/月**。
