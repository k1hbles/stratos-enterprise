"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactElement } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "children"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
  description,
  className,
  disabled = false,
  onClick,
  ...props
}: ToggleProps): ReactElement {
  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);

    if (event.defaultPrevented || disabled) {
      return;
    }

    onCheckedChange?.(!checked);
  };

  const toggleControl = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={props["aria-label"] ?? label ?? "Toggle setting"}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-[var(--success)] bg-[var(--success)]"
          : "border-[var(--surface-glass-border)] bg-[var(--bg-secondary)]",
        className,
      )}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      <motion.span
        aria-hidden
        className="absolute top-1/2 block size-5 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
        animate={{ x: checked ? 22 : 2 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      />
    </button>
  );

  if (!label && !description) {
    return toggleControl;
  }

  return (
    <div className="flex items-center justify-between gap-[var(--space-4)]">
      <div className="space-y-1">
        {label ? (
          <p className="text-[15px] font-medium text-[var(--text-primary)]">
            {label}
          </p>
        ) : null}
        {description ? (
          <p className="text-[13px] text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {toggleControl}
    </div>
  );
}
