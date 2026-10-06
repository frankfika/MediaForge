import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChatDrawer } from "@/components/chat-drawer";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediaForge",
  description: "AI-native multi-platform writing: paste a link, pick a platform, copy.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-dvh">
        <Nav />
        <ChatDrawer />
        <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6">{children}</main>
      </body>
    </html>
  );
}
