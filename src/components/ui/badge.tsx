import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "category";

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "border-[var(--surface-glass-border)] bg-[var(--surface-glass)] text-[var(--text-secondary)]",
  success: "border-[var(--success)]/35 bg-[var(--success)]/15 text-[var(--success)]",
  warning: "border-[var(--warning)]/35 bg-[var(--warning)]/15 text-[var(--warning)]",
  error: "border-[var(--error)]/35 bg-[var(--error)]/15 text-[var(--error)]",
  info: "border-[var(--info)]/35 bg-[var(--info)]/15 text-[var(--info)]",
  category:
    "border-[var(--accent)]/30 bg-[var(--accent-light)] text-[var(--accent)]",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps): ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-[var(--space-2)] py-[2px] text-[11px] font-medium uppercase tracking-[0.05em] transition-colors duration-150",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
