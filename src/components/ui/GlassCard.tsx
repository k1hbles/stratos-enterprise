import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib/utils/cn";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  highlight?: boolean;
  variant?: "default" | "elevated" | "subtle";
}

const variantStyles = {
  default: {
    bg: "bg-[var(--surface-glass)]",
    border: "border-[var(--surface-glass-border)]",
    shadow: "[box-shadow:var(--surface-glass-highlight),var(--surface-glass-shadow)]",
  },
  elevated: {
    bg: "bg-[var(--surface-glass-elevated)]",
    border: "border-[var(--surface-glass-elevated-border)]",
    shadow: "[box-shadow:var(--surface-glass-elevated-highlight),var(--surface-glass-elevated-shadow)]",
  },
  subtle: {
    bg: "bg-[var(--surface-glass-subtle)]",
    border: "border-[var(--surface-glass-subtle-border)]",
    shadow: "[box-shadow:var(--surface-glass-highlight),var(--surface-glass-shadow)]",
  },
} as const;

export function GlassCard({
  className,
  hover = false,
  highlight = true,
  variant = "default",
  ...props
}: GlassCardProps): ReactElement {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border backdrop-blur-[24px]",
        styles.bg,
        styles.border,
        styles.shadow,
        highlight && "glass-highlight",
        hover &&
          "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:bg-[var(--surface-glass-hover)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]",
        className,
      )}
      {...props}
    />
  );
}
