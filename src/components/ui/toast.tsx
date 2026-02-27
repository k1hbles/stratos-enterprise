"use client";

import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export type ToastVariant = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

type ToastInput = Omit<ToastMessage, "id"> & { id?: string };

interface ToastContextValue {
  toasts: ToastMessage[];
  addToast: (toast: ToastInput) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastVariantClasses: Record<ToastVariant, string> = {
  success: "border-[var(--success)]/30",
  error: "border-[var(--error)]/30",
  info: "border-[var(--info)]/30",
};

const toastAccentClasses: Record<ToastVariant, string> = {
  success: "bg-[var(--success)]",
  error: "bg-[var(--error)]",
  info: "bg-[var(--info)]",
};

function createToastId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps): ReactElement {
  const duration = toast.duration ?? 4000;
  const variant = toast.variant ?? "info";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [duration, onDismiss, toast.id]);

  return (
    <motion.div
      layout
      role="status"
      aria-live="polite"
      className={cn(
        "relative w-full overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--bg-primary)] p-[var(--space-4)] text-[var(--text-primary)] backdrop-blur-[24px] [box-shadow:var(--surface-glass-shadow)]",
        toastVariantClasses[variant],
      )}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          toastAccentClasses[variant],
        )}
      />
      <div className="pr-[var(--space-5)]">
        <p className="text-[15px] font-semibold">{toast.title}</p>
        {toast.description ? (
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            {toast.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-all duration-150 hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        x
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: ToastProviderProps): ReactElement {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string): void => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: ToastInput): string => {
    const id = toast.id ?? createToastId();
    const nextToast: ToastMessage = { ...toast, id };
    setToasts((previous) => [...previous, nextToast]);
    return id;
  }, []);

  const clearToasts = useCallback((): void => {
    setToasts([]);
  }, []);

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      toasts,
      addToast,
      removeToast,
      clearToasts,
    }),
    [addToast, clearToasts, removeToast, toasts],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="pointer-events-none fixed bottom-[var(--space-6)] right-[var(--space-6)] z-50 w-full max-w-[360px]"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto mb-[var(--space-3)]">
              <ToastItem toast={toast} onDismiss={removeToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
