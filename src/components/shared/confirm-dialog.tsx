'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  icon?: ReactNode;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  icon,
  isLoading = false,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: {
      iconBg: 'rgba(255, 100, 100, 0.1)',
      iconColor: 'rgba(255, 100, 100, 0.8)',
      buttonBg: 'rgba(255, 100, 100, 0.15)',
      buttonHoverBg: 'rgba(255, 100, 100, 0.25)',
      buttonColor: 'rgba(255, 100, 100, 0.95)',
    },
    warning: {
      iconBg: 'rgba(255, 200, 100, 0.1)',
      iconColor: 'rgba(255, 200, 100, 0.8)',
      buttonBg: 'rgba(255, 200, 100, 0.15)',
      buttonHoverBg: 'rgba(255, 200, 100, 0.25)',
      buttonColor: 'rgba(255, 200, 100, 0.95)',
    },
    default: {
      iconBg: 'rgba(255, 255, 255, 0.08)',
      iconColor: 'rgba(255, 255, 255, 0.6)',
      buttonBg: 'rgba(255, 255, 255, 0.1)',
      buttonHoverBg: 'rgba(255, 255, 255, 0.15)',
      buttonColor: 'rgba(255, 255, 255, 0.9)',
    },
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[400px] mx-4"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(30, 30, 30, 0.98), rgba(20, 20, 20, 0.98))',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div className="p-6 pb-4">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: styles.iconBg }}
                  >
                    {icon || (
                      <AlertTriangle
                        className="w-6 h-6"
                        strokeWidth={1.5}
                        style={{ color: styles.iconColor }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2
                      className="text-[17px] font-semibold mb-1"
                      style={{ color: 'rgba(255, 255, 255, 0.95)' }}
                    >
                      {title}
                    </h2>
                    <p
                      className="text-[14px] leading-relaxed"
                      style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                    >
                      {description}
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg transition-all duration-150 -mr-1 -mt-1"
                    style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                    }}
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div
                className="px-6 py-4 flex items-center justify-end gap-3"
                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg text-[14px] font-medium transition-all duration-150"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg text-[14px] font-medium transition-all duration-150 flex items-center gap-2"
                  style={{
                    background: styles.buttonBg,
                    color: styles.buttonColor,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = styles.buttonHoverBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = styles.buttonBg;
                  }}
                >
                  {isLoading && (
                    <div
                      className="w-4 h-4 border-2 rounded-full animate-spin"
                      style={{
                        borderColor: 'transparent',
                        borderTopColor: styles.buttonColor,
                      }}
                    />
                  )}
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
