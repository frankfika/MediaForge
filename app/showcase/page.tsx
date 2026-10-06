"use client";
import { FileText, Inbox, Link2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Chat } from "@/components/chat";
import { EmptyState } from "@/components/empty-state";
import { LlmModePill } from "@/components/llm-mode-badge";
import { PlatformPicker } from "@/components/platform-picker";
import { PostTabs, SourceCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import type { Platform, RewriteResult, Source } from "@/lib/types";

const source: Source = {
  url: "https://example.com",
  title: "Example Domain",
  author: "example.com",
  text: "This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination.",
  images: [],
  videos: [],
};

const result: RewriteResult = {
  media: { images: [], videos: [] },
  posts: [
    { platform: "wechat", title: "一个域名的自我修养", body: "这个域名专为文档中的示例而生。\n\n你可以在文章里直接引用它,无需事先申请。" },
    { platform: "x", body: "example.com: 专为示例而生的域名,随便引用。" },
    { platform: "xhs", title: "example.com 是什么?", body: "文档里的示例域名,直接用就行 ✨" },
    { platform: "bilibili", title: "example.com 科普", body: "三十秒了解互联网里最著名的示例域名。" },
  ],
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    {children}
  </section>
);

export default function Showcase() {
  const [platforms, setPlatforms] = useState<Platform[]>(["xhs"]);
  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight">组件预览</h1>
      <Section title="Button">
        <div className="flex gap-2">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </Section>
      <Section title="SourceCard + PostTabs">
        <SourceCard source={source} />
        <PostTabs result={result} />
      </Section>
      <Section title="PlatformPicker">
        <PlatformPicker value={platforms} onChange={setPlatforms} />
      </Section>
      <Section title="Chat">
        <div className="rounded-[var(--radius-card)] border border-line p-4">
          <Chat variant="drawer" />
        </div>
      </Section>
      <Section title="LlmModeBadge">
        <div className="flex gap-2">
          <LlmModePill mode="mock" />
          <LlmModePill mode="anthropic" />
        </div>
      </Section>
      <Section title="EmptyState">
        <div className="grid gap-3 sm:grid-cols-3">
          <EmptyState icon={Inbox} title="还没有内容" hint="从首页开始一次改写。" />
          <EmptyState icon={FileText} title="没有风格" />
          <EmptyState icon={Link2} title="抓取失败" hint="检查链接后重试。" />
        </div>
      </Section>
    </div>
  );
}
