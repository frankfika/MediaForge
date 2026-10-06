"use client";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 pt-[15vh] text-center">
      <h1 className="text-2xl font-semibold tracking-tight">出了点小问题</h1>
      <p className="max-w-md text-sm text-muted">{error.message || "页面加载失败。"}{error.digest && ` (${error.digest})`}</p>
      <Button onClick={reset}>重试</Button>
    </motion.div>
  );
}
