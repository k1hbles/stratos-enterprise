'use client';

import { motion } from 'framer-motion';
import { Users, Search, BarChart2, Globe, FileText } from 'lucide-react';

const QUICK_ACTIONS = [
  { category: 'Agent', label: 'Board Session', mode: 'council',  icon: Users },
  { category: 'Agent', label: 'Research',      mode: 'openclaw', icon: Search },
  { category: 'Agent', label: 'Analyse Data',  mode: 'openclaw', icon: BarChart2 },
  { category: 'Agent', label: 'Market Intel',  mode: 'openclaw', icon: Globe },
  { category: 'Agent', label: 'Report',        mode: 'openclaw', icon: FileText },
] as const;

export type QuickAction = typeof QUICK_ACTIONS[number];

interface SkillButtonsProps {
  animateIn?: boolean;
  activeMode?: QuickAction | null;
  onSelect?: (action: QuickAction) => void;
}

export function SkillButtons({ animateIn = true, activeMode, onSelect }: SkillButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={animateIn ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-wrap items-center justify-center gap-2 mt-5"
    >
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        const isActive = activeMode?.mode === action.mode;
        return (
          <button
            key={action.label}
            type="button"
            onClick={() => onSelect?.(action)}
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium transition-all duration-150 cursor-pointer"
            style={{
              background: isActive ? 'rgba(59, 130, 246, 0.06)' : 'var(--skill-bg)',
              border: isActive ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid var(--skill-border)',
              borderRadius: '9999px',
              color: isActive ? 'rgba(59, 130, 246, 0.9)' : 'var(--skill-text)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--skill-hover-bg)';
                e.currentTarget.style.borderColor = 'var(--skill-hover-border)';
                e.currentTarget.style.color = 'var(--skill-hover-text)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--skill-bg)';
                e.currentTarget.style.borderColor = 'var(--skill-border)';
                e.currentTarget.style.color = 'var(--skill-text)';
              }
            }}
          >
            <Icon className="w-4 h-4" strokeWidth={1.5} />
            {action.label}
          </button>
        );
      })}
    </motion.div>
  );
}
