'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Calendar, Search, GraduationCap, BarChart3, FileText } from 'lucide-react';
import { useSkillsStore } from '@/stores/skills-store';

const ICON_MAP: Record<string, React.ElementType> = {
  Mail, Calendar, Search, GraduationCap, BarChart3, FileText,
};

export function SkillBadges() {
  const { activeSkills, deactivateSkill } = useSkillsStore();

  return (
    <AnimatePresence mode="popLayout">
      {activeSkills.map((skill) => {
        const Icon = ICON_MAP[skill.icon];
        return (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium cursor-default flex-shrink-0"
            style={{
              background: 'var(--badge-bg)',
              border: '1px solid var(--badge-border)',
              borderRadius: '9999px',
              color: 'var(--badge-text)',
            }}
          >
            {Icon && <Icon className="w-3 h-3" strokeWidth={1.5} />}
            <span>{skill.name}</span>
            <button
              onClick={() => deactivateSkill(skill.id)}
              className="ml-0.5 rounded-full p-0.5 transition-colors"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--badge-dismiss-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
