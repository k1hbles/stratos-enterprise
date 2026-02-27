'use client';

import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className
      )}
    >
      <div
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl"
        style={{ background: 'rgba(255, 255, 255, 0.04)' }}
      >
        <Icon
          className="h-6 w-6"
          strokeWidth={1.5}
          style={{ color: 'rgba(255, 255, 255, 0.35)' }}
        />
      </div>

      <h3
        className="mb-2 text-[16px] font-medium"
        style={{ color: 'rgba(255, 255, 255, 0.9)' }}
      >
        {title}
      </h3>

      <p
        className="mb-6 max-w-xs text-[14px] leading-relaxed"
        style={{ color: 'rgba(255, 255, 255, 0.45)' }}
      >
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-[14px] font-medium transition-all duration-150"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
