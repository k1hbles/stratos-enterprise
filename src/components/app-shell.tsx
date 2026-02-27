'use client';

import { useState, useEffect } from 'react';
import { PanelLeft } from 'lucide-react';
import { Sidebar, MobileSidebar } from './sidebar';
import { Header } from './header';
import { ToastProvider } from './ui/toast';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    if (saved !== null) {
      setSidebarExpanded(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify(sidebarExpanded));
    document.documentElement.style.setProperty(
      '--sidebar-width',
      sidebarExpanded ? '240px' : '0px'
    );
  }, [sidebarExpanded]);

  return (
    <ToastProvider>
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((v) => !v)}
      />

      <Header onMenuClick={() => setMobileMenuOpen(true)} />
      <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Content area — Kimi uses 6px gap around content card */}
      <div className="flex-1 h-full overflow-hidden pt-12 md:pt-1.5 md:pr-1.5 md:pb-1.5 relative">
        {/* Floating sidebar expand button when collapsed (desktop only) */}
        {!sidebarExpanded && (
          <button
            onClick={() => setSidebarExpanded(true)}
            className="absolute top-4 left-4 z-30 w-8 h-8 hidden md:flex items-center justify-center rounded-lg transition-all duration-200"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <main
          className="h-full overflow-y-auto"
          style={{
            background: 'var(--content-card-bg)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--content-card-border)',
            borderRadius: '8px',
          }}
        >
          {children}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
