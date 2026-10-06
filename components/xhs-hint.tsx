"use client";
import Link from "next/link";
import { isXhsUrl } from "@/lib/cookie";
import { useT } from "@/lib/use-t";

/** Shown under inputs when the text contains a Xiaohongshu link. */
export function XhsHint({ text }: { text: string }) {
  const t = useT();
  if (!isXhsUrl(text)) return null;
  return (
    <p className="text-xs text-muted">
      {t("xhs.before")}
      <Link href="/settings" className="underline underline-offset-2 hover:text-fg">
        {t("xhs.link")}
      </Link>
      {t("xhs.after")}
    </p>
  );
}
