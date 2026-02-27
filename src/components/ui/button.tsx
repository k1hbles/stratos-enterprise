import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-[0.88] active:scale-[0.98]",
  secondary:
    "border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] text-[var(--btn-secondary-text)] backdrop-blur-[12px] hover:bg-[var(--surface-glass-hover)] active:scale-[0.98]",
  ghost:
    "border border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] active:scale-[0.98]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-[var(--space-3)] text-[13px]",
  md: "h-10 px-[var(--space-4)] text-[15px]",
  lg: "h-12 px-[var(--space-5)] text-[18px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  className,
  children,
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "Working on it...",
  leftIcon,
  rightIcon,
  disabled = false,
  type = "button",
  ...props
}: ButtonProps): ReactElement {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-full)] font-semibold tracking-[-0.01em] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <span
            aria-hidden
            className="size-2 rounded-full bg-current animate-pulse"
          />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          {leftIcon ? (
            <span aria-hidden className="inline-flex items-center">
              {leftIcon}
            </span>
          ) : null}
          <span>{children}</span>
          {rightIcon ? (
            <span aria-hidden className="inline-flex items-center">
              {rightIcon}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}
