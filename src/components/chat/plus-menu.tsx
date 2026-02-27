'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Paperclip, Plug, Bot, GraduationCap, MoreHorizontal, Check, ChevronRight } from 'lucide-react';

type MenuItem =
  | { type: 'item'; id: string; label: string; icon: React.ElementType; description: string; toggle?: boolean; active?: boolean; hasSubmenu?: boolean }
  | { type: 'divider' };

const MENU_ITEMS: MenuItem[] = [
  { type: 'item', id: 'files', label: 'Files', icon: Paperclip, description: 'Upload files' },
  { type: 'item', id: 'integrations', label: 'Integrations', icon: Plug, description: 'Connect services' },
  { type: 'divider' },
  { type: 'item', id: 'agent', label: 'Agent Mode', icon: Bot, description: 'Autonomous tasks', toggle: true, active: false },
  { type: 'item', id: 'study', label: 'Study Mode', icon: GraduationCap, description: 'Learn & quiz', toggle: true, active: false },
  { type: 'item', id: 'more', label: 'More', icon: MoreHorizontal, description: 'Other options', hasSubmenu: true },
];

interface PlusMenuProps {
  onFileClick?: () => void;
}

export function PlusMenu({ onFileClick }: PlusMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        type="button"
        className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-150"
        style={{
          color: open ? 'var(--toolbar-hover-icon)' : 'var(--toolbar-icon)',
          background: open ? 'var(--toolbar-hover-bg)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.background = 'var(--toolbar-hover-bg)';
            e.currentTarget.style.color = 'var(--toolbar-hover-icon)';
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--toolbar-icon)';
          }
        }}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-[240px] py-2 z-50"
            style={{
              background: 'var(--dropdown-bg)',
              border: '1px solid var(--dropdown-border)',
              borderRadius: '14px',
              boxShadow: 'var(--dropdown-shadow)',
            }}
          >
            {MENU_ITEMS.map((item, idx) => {
              if (item.type === 'divider') {
                return (
                  <div
                    key={`divider-${idx}`}
                    className="my-1 mx-3"
                    style={{ borderTop: '1px solid var(--dropdown-divider)' }}
                  />
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'files') onFileClick?.();
                    if (!item.hasSubmenu) setOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg transition-all duration-100 text-left"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--dropdown-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <item.icon
                    className="w-[18px] h-[18px] flex-shrink-0"
                    strokeWidth={1.5}
                    style={{ color: 'var(--dropdown-icon)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[14px] font-medium"
                      style={{ color: 'var(--dropdown-label)' }}
                    >
                      {item.label}
                    </div>
                    <div
                      className="text-[12px] mt-0.5"
                      style={{ color: 'var(--dropdown-desc)' }}
                    >
                      {item.description}
                    </div>
                  </div>
                  {item.toggle && item.active && (
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--dropdown-check)' }} />
                  )}
                  {item.hasSubmenu && (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--dropdown-arrow)' }} />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
