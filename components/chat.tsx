"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { PostTabs, SourceCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { XhsHint } from "@/components/xhs-hint";
import { getXhsCookie } from "@/lib/cookie";
import { DEMO_STYLES } from "@/lib/demo-styles";
import { post } from "@/lib/http";
import { loadDemoStyles, useStyles } from "@/lib/styles-store";
import { PLATFORMS, type ChatMessage, type RewriteResult, type Source } from "@/lib/types";

const transports = { page: new DefaultChatTransport({ api: "/api/chat" }), drawer: new DefaultChatTransport({ api: "/api/global-chat" }) };
const SUGGESTIONS = ["粘贴一条推文 / 小红书 / B 站链接,我来改写", "围绕「AI 编程助手的下一步」写一篇公众号文章", "把这篇文章改成小红书风格"];

const Status = ({ children }: { children: string }) => (
  <p className="flex items-center gap-2 text-xs text-muted">
    <Loader2 className="size-3 animate-spin" />
    {children}
  </p>
);

export function Chat({ variant = "page" }: { variant?: keyof typeof transports }) {
  const drawer = variant === "drawer";
  const { active } = useStyles();
  const { messages, sendMessage, status, error } = useChat<ChatMessage>({ transport: transports[variant] });
  const [input, setInput] = useState("");
  const [demo, setDemo] = useState<(RewriteResult & { source: Source }) | null>(null);
  const [demoState, setDemoState] = useState<"idle" | "loading" | string>("idle");
  const busy = status === "submitted" || status === "streaming";

  /** Demo styles + example.com -> 4 platforms via /api/rewrite (works with the mock LLM, no key needed). */
  async function tryDemo() {
    setDemoState("loading");
    loadDemoStyles();
    try {
      setDemo(await post("/api/rewrite", { url: "https://example.com", platforms: PLATFORMS, style: DEMO_STYLES[0] }));
      setDemoState("idle");
    } catch (e) {
      setDemoState(e instanceof Error ? e.message : "失败了");
    }
  }

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text }, { body: { style: active, xhsCookie: getXhsCookie() } });
    setInput("");
  }
  const onSubmit = (e: FormEvent) => (e.preventDefault(), send(input));

  return (
    <div className={drawer ? "flex min-h-full flex-col gap-6" : "flex flex-col gap-6"}>
      {messages.length === 0 && !demo && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={drawer ? "pt-8 text-center" : "pt-[12vh] text-center"}>
          <h1 className="text-3xl font-semibold tracking-tight">今天想发点什么?</h1>
          <p className="mt-2 text-sm text-muted">贴一个链接,或者说一个话题。{active ? `当前风格:${active.name}` : "尚未选择风格,将使用默认文风。"}</p>
          <div className="mt-8 flex flex-col items-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => setInput(s)} className="rounded-full border border-line px-4 py-1.5 text-sm text-muted transition hover:text-fg">
                {s}
              </button>
            ))}
            <Button variant="outline" size="sm" onClick={tryDemo} disabled={demoState === "loading"}>
              {demoState === "loading" && <Loader2 className="size-3.5 animate-spin" />}试一下:示例风格 + example.com → 4 平台
            </Button>
            {demoState !== "idle" && demoState !== "loading" && <p className="text-xs text-red-500">{demoState}</p>}
          </div>
        </motion.section>
      )}
      {demo && (
        <div className="flex flex-col gap-3">
          <SourceCard source={demo.source} />
          <PostTabs result={demo} />
        </div>
      )}

      {messages.map((m) => (
        <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={m.role === "user" ? "self-end rounded-2xl bg-line px-4 py-2 text-sm" : "flex flex-col gap-3"}>
          {m.parts.map((p, i) => {
            switch (p.type) {
              case "text":
                return <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed">{p.text}</p>;
              case "tool-fetch_link":
                return p.state === "output-available" ? <SourceCard key={i} source={p.output} /> : p.state === "output-error" ? <Status key={i}>{`抓取失败:${p.errorText}`}</Status> : <Status key={i}>正在抓取链接…</Status>;
              case "tool-rewrite_post":
                return p.state === "output-available" ? <PostTabs key={i} result={p.output} /> : p.state === "output-error" ? <Status key={i}>{`改写失败:${p.errorText}`}</Status> : <Status key={i}>正在改写…</Status>;
              default:
                return null;
            }
          })}
        </motion.div>
      ))}
      {busy && messages.at(-1)?.role === "user" && <Status>思考中…</Status>}
      {error && <p className="text-sm text-red-500">{error.message}</p>}

      <form onSubmit={onSubmit} className={drawer ? "sticky bottom-0 mt-auto bg-bg pb-4 pt-2" : "fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-5 pt-8"}>
        <div className="mx-auto max-w-3xl px-2 empty:hidden"><XhsHint text={input} /></div>
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-line bg-card p-2 shadow-sm">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && (e.preventDefault(), send(input))}
            rows={1}
            placeholder="粘贴链接或描述话题,例如 https://example.com …(Enter 发送)"
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="发送">
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
