import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-10 text-center">
      <Icon className="size-6 text-muted" />
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
