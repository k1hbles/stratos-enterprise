"use client";

import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type DropdownAlign = "left" | "right";
type DropdownItemTone = "default" | "danger";

export interface DropdownItem {
  id: string;
  label: string;
  onSelect?: () => void;
  href?: string;
  icon?: ReactNode;
  disabled?: boolean;
  tone?: DropdownItemTone;
}

export interface DropdownProps {
  trigger: ReactNode;
  triggerLabel?: string;
  items: DropdownItem[];
  align?: DropdownAlign;
  closeOnSelect?: boolean;
  className?: string;
  menuClassName?: string;
}

function getNextEnabledIndex(
  items: DropdownItem[],
  startIndex: number,
  direction: 1 | -1,
): number {
  if (items.length === 0) {
    return -1;
  }

  let cursor = startIndex;

  for (let i = 0; i < items.length; i += 1) {
    cursor = (cursor + direction + items.length) % items.length;
    if (!items[cursor]?.disabled) {
      return cursor;
    }
  }

  return -1;
}

export function Dropdown({
  trigger,
  triggerLabel = "Open menu",
  items,
  align = "right",
  closeOnSelect = true,
  className,
  menuClassName,
}: DropdownProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);
  const menuId = useId();

  const firstEnabledIndex = useMemo<number>(
    () => items.findIndex((item) => !item.disabled),
    [items],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent): void => {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialIndex = firstEnabledIndex;

    if (initialIndex >= 0) {
      requestAnimationFrame(() => {
        itemRefs.current[initialIndex]?.focus();
      });
    }
  }, [firstEnabledIndex, isOpen]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const currentIndex = itemRefs.current.findIndex(
        (node) => node === document.activeElement,
      );
      const startIndex = currentIndex >= 0 ? currentIndex : firstEnabledIndex;
      const nextIndex = getNextEnabledIndex(items, startIndex, 1);
      if (nextIndex >= 0) {
        itemRefs.current[nextIndex]?.focus();
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const currentIndex = itemRefs.current.findIndex(
        (node) => node === document.activeElement,
      );
      const startIndex = currentIndex >= 0 ? currentIndex : firstEnabledIndex;
      const previousIndex = getNextEnabledIndex(items, startIndex, -1);
      if (previousIndex >= 0) {
        itemRefs.current[previousIndex]?.focus();
      }
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      if (firstEnabledIndex >= 0) {
        itemRefs.current[firstEnabledIndex]?.focus();
      }
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastEnabled = getNextEnabledIndex(items, 0, -1);
      if (lastEnabled >= 0) {
        itemRefs.current[lastEnabled]?.focus();
      }
    }
  };

  const handleSelect = (item: DropdownItem): void => {
    if (item.disabled) {
      return;
    }

    item.onSelect?.();

    if (closeOnSelect) {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className={cn("relative inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] px-[var(--space-3)] py-[var(--space-2)] text-[13px] font-medium text-[var(--text-primary)] transition-all duration-150 hover:bg-[var(--surface-glass-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        onClick={() => setIsOpen((previous) => !previous)}
        onKeyDown={handleTriggerKeyDown}
      >
        {trigger}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            id={menuId}
            role="menu"
            aria-orientation="vertical"
            className={cn(
              "absolute top-[calc(100%+var(--space-2))] z-50 min-w-[220px] rounded-[var(--radius-lg)] border border-[var(--surface-glass-border)] bg-[var(--bg-primary)] p-2 backdrop-blur-[24px] [box-shadow:var(--surface-glass-shadow)]",
              align === "left" ? "left-0" : "right-0",
              menuClassName,
            )}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={handleMenuKeyDown}
          >
            {items.map((item, index) => {
              const itemClasses = cn(
                "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)] text-left text-[13px] transition-all duration-150",
                item.tone === "danger"
                  ? "text-[var(--error)] hover:bg-[var(--error)]/12"
                  : "text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)]",
                item.disabled
                  ? "cursor-not-allowed opacity-40 hover:bg-transparent"
                  : "",
              );

              if (item.href) {
                return (
                  <a
                    key={item.id}
                    ref={(node) => {
                      itemRefs.current[index] = node;
                    }}
                    role="menuitem"
                    tabIndex={-1}
                    className={itemClasses}
                    href={item.href}
                    onClick={(event) => {
                      if (item.disabled) {
                        event.preventDefault();
                        return;
                      }
                      handleSelect(item);
                    }}
                  >
                    {item.icon ? <span aria-hidden>{item.icon}</span> : null}
                    <span>{item.label}</span>
                  </a>
                );
              }

              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={itemClasses}
                  disabled={item.disabled}
                  onClick={() => handleSelect(item)}
                >
                  {item.icon ? <span aria-hidden>{item.icon}</span> : null}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
