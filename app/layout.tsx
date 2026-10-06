import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ChatDrawer } from "@/components/chat-drawer";
import { LlmModeBadge } from "@/components/llm-mode-badge";
import { Nav } from "@/components/nav";
import { ThemeInit } from "@/components/theme-toggle";
import { HTML_LANG, LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/use-t";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediaForge",
  description: "AI-native multi-platform writing: paste a link, pick a platform, copy.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(v) ? v : "zh";
  return (
    <html lang={HTML_LANG[locale]} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("mediaforge.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh">
        <LocaleProvider locale={locale}>
          <ThemeInit />
          <Nav />
          <ChatDrawer />
          <LlmModeBadge />
          <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6">{children}</main>
        </LocaleProvider>
      </body>
    </html>
  );
}
