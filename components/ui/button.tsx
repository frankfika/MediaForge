import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-fg text-bg hover:opacity-90",
        ghost: "text-muted hover:bg-line hover:text-fg",
        outline: "border border-line hover:bg-line",
      },
      size: { sm: "h-8 px-3", md: "h-9 px-4", icon: "size-9" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({ className, variant, size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}
