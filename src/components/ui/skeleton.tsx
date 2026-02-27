import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib/utils/cn";

type SkeletonVariant = "text" | "card" | "avatar" | "list";
type AvatarSize = "sm" | "md" | "lg";

const avatarClasses: Record<AvatarSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
};

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  lines?: number;
  avatarSize?: AvatarSize;
}

function SkeletonBlock({ className }: { className?: string }): ReactElement {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-[var(--glass-bg)]",
        className,
      )}
    />
  );
}

export function Skeleton({
  variant = "text",
  lines = 3,
  avatarSize = "md",
  className,
  ...props
}: SkeletonProps): ReactElement {
  if (variant === "avatar") {
    return (
      <div className={cn("inline-flex", className)} {...props}>
        <SkeletonBlock
          className={cn(
            "rounded-full border border-[var(--border-subtle)]",
            avatarClasses[avatarSize],
          )}
        />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-[var(--space-5)]",
          className,
        )}
        {...props}
      >
        <SkeletonBlock className="h-6 w-2/5" />
        <div className="mt-[var(--space-4)] space-y-2">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
          <SkeletonBlock className="h-4 w-4/6" />
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-[var(--space-3)]", className)} {...props}>
        {Array.from({ length: Math.max(2, lines) }, (_, index) => (
          <div
            key={`skeleton-list-${index + 1}`}
            className="flex items-center gap-[var(--space-3)]"
          >
            <SkeletonBlock className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-3 w-2/3" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <SkeletonBlock
          key={`skeleton-text-${index + 1}`}
          className={cn(
            "h-4",
            index === lines - 1 ? "w-3/4" : "w-full",
          )}
        />
      ))}
    </div>
  );
}
