import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChatDrawer } from "@/components/chat-drawer";
import { LlmModeBadge } from "@/components/llm-mode-badge";
import { Nav } from "@/components/nav";
import { ThemeInit } from "@/components/theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediaForge",
  description: "AI-native multi-platform writing: paste a link, pick a platform, copy.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("mediaforge.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body className="min-h-dvh">
        <ThemeInit />
        <Nav />
        <ChatDrawer />
        <LlmModeBadge />
        <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6">{children}</main>
      </body>
    </html>
  );
}
