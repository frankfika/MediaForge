import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 pt-[15vh] text-center">
      <p className="text-5xl font-semibold tracking-tight text-muted">404</p>
      <p className="text-sm text-muted">这个页面不存在。</p>
      <Link href="/" className="text-sm text-accent underline">回到首页</Link>
    </div>
  );
}
