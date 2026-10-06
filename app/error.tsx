"use client";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/use-t";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 pt-[15vh] text-center"
    >
      <h1 className="text-2xl font-semibold tracking-tight">{t("error.title")}</h1>
      <p className="max-w-md text-sm text-muted">
        {error.message || t("error.fallback")}
        {error.digest && ` (${error.digest})`}
      </p>
      <Button onClick={reset}>{t("common.retry")}</Button>
    </motion.div>
  );
}
