import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib/utils/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  glass?: boolean;
}

export function Card({
  className,
  interactive = true,
  glass = true,
  ...props
}: CardProps): ReactElement {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border p-[var(--space-6)] text-[var(--text-primary)]",
        glass
          ? "border-[var(--surface-glass-border)] bg-[var(--surface-glass)] backdrop-blur-[24px] [box-shadow:var(--surface-glass-highlight),var(--surface-glass-shadow)]"
          : "border-[var(--surface-glass-border)] bg-[var(--bg-tertiary)]",
        interactive
          ? "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:bg-[var(--surface-glass-hover)]"
          : "",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      className={cn("mb-[var(--space-4)] flex flex-col gap-1", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>): ReactElement {
  return (
    <h3
      className={cn(
        "text-[18px] font-semibold leading-[1.1] tracking-[-0.02em]",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>): ReactElement {
  return (
    <p
      className={cn(
        "text-[15px] leading-[1.6] text-[var(--text-secondary)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return <div className={cn("space-y-[var(--space-4)]", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      className={cn(
        "mt-[var(--space-5)] flex items-center justify-end gap-[var(--space-3)]",
        className,
      )}
      {...props}
    />
  );
}
