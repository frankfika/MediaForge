import Link from "next/link";
import { isXhsUrl } from "@/lib/cookie";

/** Shown under inputs when the text contains a Xiaohongshu link. */
export function XhsHint({ text }: { text: string }) {
  if (!isXhsUrl(text)) return null;
  return (
    <p className="text-xs text-muted">
      部分小红书笔记需登录态。如果没拿到正文,请到 <Link href="/settings" className="underline underline-offset-2 hover:text-fg">设置页</Link> 填入 cookie(无法保证绕过风控)。
    </p>
  );
}
