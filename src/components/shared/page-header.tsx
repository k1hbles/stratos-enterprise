'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/animations';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn('mb-8 flex items-start justify-between', className)}
    >
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] md:text-3xl" style={{ letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--text-secondary)] md:text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  );
}
