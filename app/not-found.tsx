"use client";
import Link from "next/link";
import { useT } from "@/lib/use-t";

export default function NotFound() {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 pt-[15vh] text-center">
      <p className="text-5xl font-semibold tracking-tight text-muted">404</p>
      <p className="text-sm text-muted">{t("notFound.text")}</p>
      <Link href="/" className="text-sm text-accent underline">
        {t("notFound.home")}
      </Link>
    </div>
  );
}
