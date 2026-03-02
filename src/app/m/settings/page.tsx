'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, User, ChevronRight, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function MobileSettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 z-10" style={{ background: 'var(--bg-page)' }}>
        <button onClick={() => router.back()} style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={24} />
        </button>
        <span className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Settings</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        {/* Profile Card */}
        <div className="rounded-2xl p-4 flex items-center gap-4 mb-4" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
            <User size={28} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div className="flex flex-col">
            <span className="text-[16px] font-medium" style={{ color: 'var(--text-primary)' }}>User</span>
            <span className="text-[13px]" style={{ color: 'var(--text-placeholder)' }}>Manage your account</span>
          </div>
        </div>

        {/* Settings sections */}
        <div className="rounded-2xl flex flex-col" style={{ background: 'var(--bg-tertiary)' }}>
          {/* Theme toggle row */}
          <div
            className="flex items-center justify-between px-4 py-3.5 cursor-pointer"
            onClick={toggleTheme}
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3">
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {theme === 'dark'
                  ? <Moon size={16} style={{ color: 'var(--text-muted)' }} />
                  : <Sun size={16} style={{ color: 'var(--text-muted)' }} />
                }
              </div>
              <span style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                Theme
              </span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, color: 'var(--text-muted)',
            }}>
              <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Other settings rows */}
          {['General', 'Appearance', 'Notifications', 'Data & Privacy', 'About'].map((item) => (
            <button
              key={item}
              className="flex items-center justify-between p-4 text-[15px]"
              style={{
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {item}
              <ChevronRight size={18} style={{ color: 'var(--text-placeholder)' }} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
