'use client';

import { useState, useEffect, useRef, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Brain,
  ScrollText,
  Plug,
  GalleryHorizontalEnd,
  Settings,
  ChevronDown,
  PanelLeft,
  LogOut,
  HelpCircle,
  CreditCard,
  ChevronUp,
  History as HistoryIcon,
  type LucideIcon,
} from 'lucide-react';
import { trpc } from '@/trpc/client';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/theme-provider';

interface NavItemConfig {
  href: string;
  icon: LucideIcon;
  label: string;
  matchPrefix?: boolean;
}

const navGroups: NavItemConfig[][] = [
  [
    { href: '/app/chat', icon: MessageSquare, label: 'Chat', matchPrefix: true },
    { href: '/app/intelligence', icon: Brain, label: 'Council', matchPrefix: true },
  ],
  [
    { href: '/app/audit', icon: ScrollText, label: 'Audit', matchPrefix: true },
    { href: '/app/integrations', icon: Plug, label: 'Integrations', matchPrefix: true },
    { href: '/app/images', icon: GalleryHorizontalEnd, label: 'Gallery', matchPrefix: true },
  ],
];

function isNavActive(pathname: string, item: NavItemConfig): boolean {
  if (item.matchPrefix) {
    return pathname.startsWith(item.href);
  }
  return pathname === item.href;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return `${Math.floor(diffDays / 30)}mo`;
}

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

export const Sidebar = memo(function Sidebar({ expanded, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { data: recentConversations } = trpc.chat.listConversations.useQuery(
    { limit: 10 },
    { enabled: expanded }
  );
  const recentItems = (recentConversations ?? []) as { id: string; title: string | null; preview: string | null; updated_at: string }[];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const { user, signOut } = useAuth();
  const userInitial = user?.email?.[0]?.toUpperCase() ?? 'U';
  const userName = user?.email ?? 'User';

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: expanded ? 1 : 0,
        x: expanded ? 0 : -20,
        width: expanded ? 240 : 0,
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative z-20 hidden flex-col md:flex"
      style={{
        height: '100%',
        background: 'var(--sidebar-bg)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Logo row */}
      <div className="flex items-center justify-between h-[48px] px-3" style={{ minWidth: '240px' }}>
        <Link href="/app" className="flex items-center">
          <Image
            src={resolvedTheme === 'dark' ? '/elk-logo-dark.png' : '/elk-logo-black.png'}
            alt="ELK"
            width={56}
            height={20}
            className="object-contain flex-shrink-0"
          />
        </Link>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg transition-all duration-200"
          style={{ color: 'var(--sidebar-collapse-icon)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-collapse-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="px-2 mt-2" style={{ minWidth: '240px' }}>
        <button
          className="flex items-center gap-3 rounded-lg text-[13px] transition-all duration-200 w-full px-2 py-2"
          style={{ background: 'var(--search-bg)', color: 'var(--search-text)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--search-hover-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--search-bg)'; }}
        >
          <Search className="flex-shrink-0 w-3.5 h-3.5" strokeWidth={1.5} />
          <span className="flex-1 text-left">Search</span>
          <span className="text-[11px] opacity-50">&#x2318;K</span>
        </button>
      </div>

      <Nav pathname={pathname} expanded={true} />

      <div className="mt-1 px-2" style={{ minWidth: '240px' }}>
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="w-full flex items-center gap-3 text-[14px] transition-all duration-200"
          style={{ color: 'var(--nav-text)', fontWeight: 500, borderRadius: '12px', padding: '12px 8px' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <HistoryIcon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
          <span>History</span>
        </button>

        <AnimatePresence>
          {historyExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-0.5 space-y-0.5">
                {recentItems.length === 0 ? (
                  <p className="text-[12px] px-2 py-2 text-center" style={{ color: 'var(--history-empty)' }}>
                    No conversations yet
                  </p>
                ) : (
                  <>
                    {recentItems.slice(0, 5).map((item, index) => (
                      <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12, delay: index * 0.02 }}>
                        <HistoryItem id={item.id} title={item.title} preview={item.preview} updatedAt={item.updated_at} isActive={pathname === `/app/chat/${item.id}`} />
                      </motion.div>
                    ))}
                    <Link
                      href="/app/chat"
                      className="flex items-center gap-1 px-2 py-1 mt-0.5 text-[12px] transition-colors duration-150"
                      style={{ color: 'var(--history-label)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--history-label-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--history-label)'; }}
                    >
                      <span>See all</span>
                      <span>&rarr;</span>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1" />

      <div className="px-2" style={{ minWidth: '240px' }}>
        {(() => {
          const active = pathname.startsWith('/app/settings');
          return (
            <Link
              href="/app/settings"
              className="w-full flex items-center gap-3 text-[14px] transition-all duration-200"
              style={{
                background: active ? 'var(--nav-active-bg)' : 'transparent',
                color: active ? 'var(--nav-text-active)' : 'var(--nav-text)',
                fontWeight: active ? 500 : 400,
                borderRadius: '12px',
                padding: '12px 8px',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Settings className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              <span>Settings</span>
            </Link>
          );
        })()}
      </div>

      <div ref={profileMenuRef} className="px-2 pb-3 pt-2 relative" style={{ minWidth: '240px' }}>
        <AnimatePresence>
          {profileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 rounded-lg overflow-hidden z-50"
              style={{
                bottom: '100%',
                marginBottom: '8px',
                background: 'var(--profile-menu-bg)',
                border: '1px solid var(--profile-menu-border)',
                boxShadow: 'var(--profile-menu-shadow)',
              }}
            >
              <div className="py-1">
                <Link href="/app/settings" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-[13px] transition-all duration-150" style={{ color: 'var(--profile-menu-text)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--profile-menu-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Help</span>
                </Link>
                <Link href="/app/settings" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-[13px] transition-all duration-150" style={{ color: 'var(--profile-menu-text)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--profile-menu-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <CreditCard className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Plan</span>
                </Link>
                <div className="h-px mx-2 my-1" style={{ background: 'var(--profile-menu-divider)' }} />
                <button
                  onClick={() => { setProfileMenuOpen(false); signOut(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[13px] transition-all duration-150"
                  style={{ color: 'var(--profile-menu-danger)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--profile-menu-danger-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all duration-200"
          style={{ background: profileMenuOpen ? 'var(--avatar-open-bg)' : 'transparent' }}
          onMouseEnter={(e) => { if (!profileMenuOpen) e.currentTarget.style.background = 'var(--avatar-hover-bg)'; }}
          onMouseLeave={(e) => { if (!profileMenuOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium flex-shrink-0" style={{ background: 'var(--avatar-bg)', color: 'var(--avatar-text)' }}>
            {userInitial}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <span className="text-[13px] font-medium truncate block" style={{ color: 'var(--avatar-name)' }}>{userName}</span>
          </div>
          <ChevronUp className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${profileMenuOpen ? '' : 'rotate-180'}`} style={{ color: 'var(--avatar-chevron)' }} strokeWidth={1.5} />
        </button>
      </div>
    </motion.aside>
  );
});


function NavItem({ item, pathname, expanded }: { item: NavItemConfig; pathname: string; expanded: boolean }) {
  const active = isNavActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`w-full flex items-center transition-all duration-200 text-[14px] ${
        expanded ? 'gap-3' : 'justify-center'
      }`}
      style={{
        background: active ? 'var(--nav-active-bg)' : 'transparent',
        color: active ? 'var(--nav-text-active)' : 'var(--nav-text)',
        fontWeight: active ? 500 : 400,
        borderRadius: '12px',
        padding: expanded ? '12px 8px' : '12px 0',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className={expanded ? 'w-4 h-4 flex-shrink-0' : 'w-4 h-4 flex-shrink-0'} strokeWidth={1.5} />
      {expanded && <span>{item.label}</span>}
    </Link>
  );
}

const Nav = memo(function Nav({ pathname, expanded }: { pathname: string; expanded: boolean }) {
  return (
    <nav className="mt-2" style={{ padding: '0 8px' }}>
      {navGroups.map((group, i) => (
        <div key={i}>
          {i > 0 && <div className="h-px mx-2 my-1.5" style={{ background: 'var(--nav-separator)' }} />}
          <div className="space-y-0.5">
            {group.map((item) => (
              <NavItem key={item.href} item={item} pathname={pathname} expanded={expanded} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
});

interface HistoryItemProps {
  id: string;
  title: string | null;
  preview: string | null;
  updatedAt: string;
  isActive: boolean;
}

function getHistoryDisplayTitle(title: string | null, preview: string | null): string {
  if (title && title !== 'New Chat') return title;
  if (preview) return preview;
  return 'New Chat';
}

function HistoryItem({ id, title, preview, updatedAt, isActive }: HistoryItemProps) {
  return (
    <Link
      href={`/app/chat/${id}`}
      className="group flex items-center justify-between px-2 py-1.5 rounded-lg transition-all duration-150"
      style={{
        background: isActive ? 'var(--history-active-bg)' : 'transparent',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--history-hover-bg)'; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <span
        className="text-[12px] truncate pr-3"
        style={{ color: isActive ? 'var(--history-text-active)' : 'var(--history-text)' }}
      >
        {getHistoryDisplayTitle(title, preview)}
      </span>
      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--history-time)' }}>{formatRelativeTime(updatedAt)}</span>
    </Link>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const { data: recentConversations } = trpc.chat.listConversations.useQuery(
    { limit: 10 },
    { enabled: open }
  );
  const recentItems = (recentConversations ?? []) as { id: string; title: string | null; preview: string | null; updated_at: string }[];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  const { user, signOut } = useAuth();
  const userInitial = user?.email?.[0]?.toUpperCase() ?? 'U';
  const userName = user?.email ?? 'User';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden" />
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
            className="fixed top-0 left-0 bottom-0 z-50 w-[260px] flex flex-col md:hidden"
            style={{ background: '#161717', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center h-[52px] px-4">
              <Link href="/app" onClick={onClose} className="flex items-center">
                <Image src="/logo-mark.png" alt="Logo" width={28} height={28} className="object-contain" />
              </Link>
            </div>

            <nav className="px-2 mt-2">
              {navGroups.map((group, i) => (
                <div key={i}>
                  {i > 0 && <div className="h-px mx-2 my-1.5" style={{ background: 'var(--nav-separator)' }} />}
                  <div className="space-y-0.5">
                    {group.map((item) => {
                      const active = isNavActive(pathname, item);
                      const Icon = item.icon;
                      return (
                        <Link key={item.href} href={item.href} onClick={onClose} className="w-full flex items-center gap-3 text-[14px] transition-all duration-200"
                          style={{
                            background: active ? 'var(--nav-active-bg)' : 'transparent',
                            color: active ? 'var(--nav-text-active)' : 'var(--nav-text)',
                            fontWeight: active ? 500 : 400,
                            borderRadius: '12px',
                            padding: '12px 8px',
                          }}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-3 px-2">
              <button
                onClick={() => setHistoryExpanded(!historyExpanded)}
                className="w-full flex items-center justify-between px-2 py-1"
                style={{ color: 'var(--history-label)' }}
              >
                <span className="text-[11px] font-medium tracking-wider uppercase">History</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${historyExpanded ? '' : '-rotate-90'}`} strokeWidth={2} />
              </button>
              <AnimatePresence>
                {historyExpanded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                    <div className="mt-1">
                      {recentItems.length === 0 ? (
                        <p className="text-[12px] px-2 py-2 text-center" style={{ color: 'var(--history-empty)' }}>No conversations yet</p>
                      ) : (
                        <div className="space-y-0.5">
                          {recentItems.slice(0, 6).map((item) => {
                            const isActive = pathname === `/app/chat/${item.id}`;
                            return (
                              <Link
                                key={item.id}
                                href={`/app/chat/${item.id}`}
                                onClick={onClose}
                                className="group flex items-center justify-between px-2 py-1.5 rounded-lg transition-all duration-150"
                                style={{
                                  background: isActive ? 'var(--history-active-bg)' : 'transparent',
                                }}
                                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--history-hover-bg)'; }}
                                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                              >
                                <span className="text-[12px] truncate pr-3" style={{ color: isActive ? 'var(--history-text-active)' : 'var(--history-text)' }}>{getHistoryDisplayTitle(item.title, item.preview)}</span>
                                <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--history-time)' }}>{formatRelativeTime(item.updated_at)}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1" />

            <div className="px-2">
              <Link href="/app/settings" onClick={onClose} className="w-full flex items-center gap-3 text-[14px] transition-all duration-200"
                style={{ color: pathname.startsWith('/app/settings') ? 'var(--nav-text-active)' : 'var(--nav-text)', borderRadius: '12px', padding: '12px 8px' }}>
                <Settings className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                <span>Settings</span>
              </Link>
            </div>

            <div ref={profileMenuRef} className="px-2 pb-3 pt-2 relative">
              <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all duration-200"
                style={{ background: profileMenuOpen ? 'var(--avatar-open-bg)' : 'transparent' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium flex-shrink-0" style={{ background: 'var(--avatar-bg)', color: 'var(--avatar-text)' }}>{userInitial}</div>
                <div className="flex-1 min-w-0 text-left">
                  <span className="text-[13px] font-medium truncate block" style={{ color: 'var(--avatar-name)' }}>{userName}</span>
                </div>
                <ChevronUp className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${profileMenuOpen ? '' : 'rotate-180'}`} style={{ color: 'var(--avatar-chevron)' }} strokeWidth={1.5} />
              </button>
              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 rounded-lg overflow-hidden z-50"
                    style={{
                      bottom: '100%',
                      marginBottom: '8px',
                      background: 'var(--profile-menu-bg)',
                      border: '1px solid var(--profile-menu-border)',
                      boxShadow: 'var(--profile-menu-shadow)',
                    }}
                  >
                    <div className="py-1">
                      <button onClick={() => { setProfileMenuOpen(false); onClose(); signOut(); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-[13px] transition-all duration-150" style={{ color: 'var(--profile-menu-danger)' }}>
                        <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
