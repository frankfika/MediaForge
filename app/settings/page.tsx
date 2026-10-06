"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getXhsCookie, setXhsCookie } from "@/lib/cookie";

export default function SettingsPage() {
  const [cookie, setCookie] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => setCookie(getXhsCookie() ?? ""), []);

  function save() {
    setXhsCookie(cookie);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
      <section className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-card p-4 text-sm">
        <label htmlFor="xhs" className="font-medium">小红书 cookie <span className="font-normal text-muted">(可选)</span></label>
        <textarea
          id="xhs"
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          rows={3}
          placeholder="web_session=…; a1=…"
          className="rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-accent"
        />
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={save}>保存</Button>
          {saved && <span className="text-xs text-muted">已保存</span>}
        </div>
        <p className="text-xs leading-relaxed text-muted">
          在已登录的浏览器里打开小红书,开发者工具 → Network → 任一请求的 Cookie 头,整行复制到这里。
          cookie 仅保存在本机浏览器(base64 编码存储,这是混淆而非加密),抓取时只会随请求发往小红书域名。
          <br />
          诚实声明:cookie 不能保证绕过小红书风控,只是给部分需要登录的笔记多一条路;失败时请直接粘贴正文。
        </p>
      </section>
    </div>
  );
}
