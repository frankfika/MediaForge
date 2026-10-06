"use client";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Chat } from "@/components/chat";
import { Button } from "@/components/ui/button";

/** ⌘K / Ctrl+K opens a global chat drawer on any page. Stays mounted after first open so the conversation survives close. */
export function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setSeen(true);
      opener.current = document.activeElement;
      // wait a frame: the textarea mounts on first open
      requestAnimationFrame(() => panel.current?.querySelector("textarea")?.focus());
    } else (opener.current as HTMLElement | null)?.focus?.();
  }, [open]);

  return (
    <>
      <motion.div
        aria-hidden
        onClick={() => setOpen(false)}
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        style={{ pointerEvents: open ? "auto" : "none" }}
      />
      <motion.aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="全局对话"
        inert={!open}
        initial={false}
        animate={{ x: open ? 0 : "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-bg shadow-xl"
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
          <span className="text-sm font-medium">MediaForge 助手 <kbd className="ml-2 rounded border border-line px-1 text-[10px] text-muted">⌘K</kbd></span>
          <Button variant="ghost" size="icon" aria-label="关闭" onClick={() => setOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-4">{seen && <Chat variant="drawer" />}</div>
      </motion.aside>
    </>
  );
}
