# 小红书真实抓取测试

集成脚本 `scripts/test-xhs-fetch.mjs`,走真实网络、真实 `lib/fetcher.ts` 的 `fetchLink`,**不在 CI 中运行**。

```bash
# 1. 把 cookie 放进 .env.local(已在 .gitignore,切勿提交)
echo 'XHS_COOKIE=a1=...; web_session=...' >> .env.local

# 2. 跑
pnpm test:xhs "https://www.xiaohongshu.com/explore/<note_id>"
# 或 XHS_URL=... pnpm test:xhs
```

输出 title / author / text / images / videos,并判断 `text.length > 100` 且不是 404/登录/验证码壳页:PASS 退出码 0,否则 1(无 URL 为 2)。无 cookie 时走匿名抓取。

## 获取 cookie

1. 浏览器打开 <https://www.xiaohongshu.com> 并登录。
2. DevTools(F12)→ Network → 刷新 → 点任一发往 `xiaohongshu.com` 的请求。
3. Request Headers 里复制整行 `Cookie:` 的值(含 `a1`、`web_session`)。
4. 也可在应用「设置」页粘贴,效果相同(仅发往 xiaohongshu.com / xhslink.com)。

cookie 等同登录凭证,会过期;不要贴进 issue、截图或提交。

## URL 模板

| 形式          | 示例                                                                  |
| ------------- | --------------------------------------------------------------------- |
| 探索页        | `https://www.xiaohongshu.com/explore/<note_id>`                       |
| 带 token 分享 | `https://www.xiaohongshu.com/discovery/item/<note_id>?xsec_token=...` |
| 短链          | `http://xhslink.com/<code>`(会先解析跳转)                             |

用户主页/搜索页等不是笔记,抓不到正文。

## 失败原因与建议

| 现象                        | 原因                                                   | 建议                                              |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| title「你访问的页面不见了」 | 笔记 ID 不存在/已删除,或缺 `xsec_token` 被当作无效链接 | 用 App 分享出的完整链接(带 `xsec_token`)          |
| 正文很短 / 只有页脚         | 登录墙或风控壳页                                       | 配置 `XHS_COOKIE`;或配 `FIRECRAWL_API_KEY` 走兜底 |
| 验证码/安全验证             | IP 或频率触发风控                                      | 换网络、降低频率、重新登录取新 cookie             |
| 有 cookie 仍失败            | cookie 过期或缺 `web_session`                          | 重新登录后复制                                    |

不保证绕过风控;这里只提供尝试途径。
