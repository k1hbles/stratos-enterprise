'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Search,
  FileSpreadsheet,
  Presentation,
  User,
  Settings,
  Pencil,
  ListFilter,
  ArrowUpFromDot,
  Trash2,
  Check,
  Circle,
  CheckCircle2,
  GalleryHorizontalEnd,
  Cable,
  Download,
  X,
  ChevronLeft,
  SquarePen,
  Sun,
  Monitor,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface Conversation {
  id: string;
  title: string | null;
  updated_at: string;
}

function getIconForTitle(title: string | null) {
  if (!title) return undefined;
  const lower = title.toLowerCase();
  if (lower.includes('slide') || lower.includes('presentation') || lower.includes('deck'))
    return <Presentation size={18} />;
  if (lower.includes('spreadsheet') || lower.includes('xlsx') || lower.includes('budget') || lower.includes('companies'))
    return <FileSpreadsheet size={18} />;
  return undefined;
}

/* ─── Context Menu ───────────────────────────────────────── */

function ContextMenu({
  x,
  y,
  onRename,
  onMultiSelect,
  onPin,
  onDelete,
  onClose,
}: {
  x: number;
  y: number;
  onRename: () => void;
  onMultiSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose]);

  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    left: Math.min(x, 180),
    top: y,
    zIndex: 100,
  };

  const items = [
    { label: 'Rename', icon: <Pencil size={18} />, action: onRename, danger: false },
    { label: 'Multi-select', icon: <ListFilter size={18} />, action: onMultiSelect, danger: false },
    { label: 'Pin to top', icon: <ArrowUpFromDot size={18} />, action: onPin, danger: false },
    { label: 'Delete', icon: <Trash2 size={18} />, action: onDelete, danger: true },
  ];

  return (
    <>
      <div className="absolute inset-0 z-[90] bg-[var(--overlay)] backdrop-blur-md" onClick={onClose} />
      <div ref={menuRef} style={menuStyle} className="z-[100] w-[240px] bg-[var(--sidebar-item-active)]/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-subtle)]">
        {items.map((item, i) => (
          <button
            key={item.label}
            onClick={() => {
              item.action();
              onClose();
            }}
            className={`flex items-center justify-between w-full px-4 py-3.5 text-[16px] transition-colors active:bg-[var(--sidebar-item-hover)] ${
              item.danger ? 'text-red-400' : 'text-[var(--text-primary)]'
            } ${i < items.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}
          >
            <span>{item.label}</span>
            <span className={item.danger ? 'text-red-400' : 'text-[var(--text-secondary)]'}>{item.icon}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ─── Rename Dialog ──────────────────────────────────────── */

function RenameDialog({
  initialTitle,
  onSave,
  onCancel,
}: {
  initialTitle: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <>
      <div className="absolute inset-0 z-[90] bg-[var(--overlay)]" onClick={onCancel} />
      <div className="absolute inset-0 z-[100] flex items-center justify-center px-8">
        <div className="bg-[var(--bg-elevated)] rounded-2xl p-5 w-full max-w-[300px] flex flex-col gap-4">
          <span className="text-[16px] font-medium text-[var(--text-primary)]">Rename conversation</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(value.trim());
              if (e.key === 'Escape') onCancel();
            }}
            className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg px-3 py-2.5 text-[15px] outline-none border border-[var(--sidebar-item-active)] focus:border-[#5c9dff] no-focus-ring"
          />
          <div className="flex justify-end gap-3">
            <button onClick={onCancel} className="text-[14px] text-[var(--text-secondary)] px-3 py-1.5">
              Cancel
            </button>
            <button
              onClick={() => onSave(value.trim())}
              className="text-[14px] text-[#5c9dff] font-medium px-3 py-1.5"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Main Sidebar ───────────────────────────────────────── */

export function MobileSidebar({ onClose, onOpenSettings, onOpenGallery }: { onClose: () => void; onOpenSettings: () => void; onOpenGallery: () => void }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [multiSelect, setMultiSelect] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<Conversation | null>(null);

  // Search state
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/conversations')
      .then((r) => r.json())
      .then((data) => setConversations(data.slice(0, 30)))
      .catch(() => {});
  }, []);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const activateSearch = () => {
    setSearchActive(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const cancelSearch = () => {
    setSearchActive(false);
    setSearchQuery('');
    searchInputRef.current?.blur();
  };

  const filteredConversations = searchActive && searchQuery
    ? conversations.filter((c) =>
        (c.title || 'New Chat').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const getMenuPosition = useCallback((el: HTMLElement) => {
    const scrollContainer = historyScrollRef.current;
    if (!scrollContainer) return { x: 16, y: 0 };
    const elRect = el.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    return {
      x: 16,
      y: elRect.bottom - containerRect.top + scrollContainer.scrollTop + 4,
    };
  }, []);

  const handleTouchStart = useCallback((conv: Conversation, e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement;
    longPressTimer.current = setTimeout(() => {
      const pos = getMenuPosition(el);
      setContextMenu({ id: conv.id, ...pos });
    }, 500);
  }, [getMenuPosition]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleContextMenuEvent = useCallback((conv: Conversation, e: React.MouseEvent) => {
    e.preventDefault();
    const pos = getMenuPosition(e.currentTarget as HTMLElement);
    setContextMenu({ id: conv.id, ...pos });
  }, [getMenuPosition]);

  const handleRename = useCallback((conv: Conversation) => { setRenaming(conv); }, []);

  const handleRenameSave = useCallback(async (title: string) => {
    if (!renaming || !title) return;
    try {
      await fetch(`/api/conversations/${renaming.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      setConversations((prev) => prev.map((c) => (c.id === renaming.id ? { ...c, title } : c)));
    } catch {}
    setRenaming(null);
  }, [renaming]);

  const handleDelete = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map((id) => fetch(`/api/conversations/${id}`, { method: 'DELETE' }).catch(() => {})));
    setConversations((prev) => prev.filter((c) => !ids.includes(c.id)));
    setSelected(new Set());
    setMultiSelect(false);
  }, []);

  const handleMultiSelectDelete = useCallback(() => {
    if (selected.size === 0) return;
    handleDelete(Array.from(selected));
  }, [selected, handleDelete]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === conversations.length) setSelected(new Set());
    else setSelected(new Set(conversations.map((c) => c.id)));
  }, [selected.size, conversations]);

  const contextConv = contextMenu ? conversations.find((c) => c.id === contextMenu.id) : null;

  return (
    <div className="absolute inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--overlay)] transition-opacity" onClick={onClose} />

      {/* Sidebar Content */}
      <div className="w-[85%] max-w-[340px] bg-[var(--bg-page)] h-full relative z-10 flex flex-col p-4 pt-10 animate-slide-right shadow-2xl">

        {/* Logo */}
        <div className="mb-5 cursor-pointer" onClick={() => { onClose(); router.push('/m/chat'); }}>
          <Image
            src={resolvedTheme === 'dark' ? '/elk-logo-dark.png' : '/elk-logo-black.png'}
            alt="ELK"
            width={64}
            height={22}
            className="object-contain"
          />
        </div>

        {/* Top bar: Search + New Chat */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={activateSearch}
              className="w-full bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] rounded-xl px-3 py-2.5 pl-9 text-[15px] outline-none no-focus-ring"
            />
          </div>
          {searchActive ? (
            <button
              onClick={cancelSearch}
              className="text-[15px] text-[#5c9dff] font-medium whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={() => navigate('/m/chat')}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] shrink-0"
            >
              <SquarePen size={18} />
            </button>
          )}
        </div>

        {/* Cards — collapse when search is active */}
        <div
          style={{
            maxHeight: searchActive ? 0 : '400px',
            opacity: searchActive ? 0 : 1,
            overflow: 'hidden',
            transition: 'max-height 0.3s ease, opacity 0.2s ease',
            marginBottom: searchActive ? 0 : undefined,
          }}
        >
          {/* Card 1: Profile & Integrations */}
          <div className="bg-[var(--bg-tertiary)] rounded-2xl mb-4 flex flex-col">
            <button
              onClick={() => { onClose(); onOpenSettings(); }}
              className="flex items-center justify-between p-4 border-b border-[var(--bg-elevated)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
                  <User size={20} className="text-[var(--text-secondary)]" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium text-[16px] text-[var(--text-primary)]">My Profile</span>
                  <span className="text-[12px] text-[var(--text-placeholder)]">Settings</span>
                </div>
              </div>
              <Settings size={18} className="text-[var(--text-placeholder)]" />
            </button>
            <button
              onClick={() => { onClose(); navigate('/app/integrations'); }}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <Cable size={18} className="text-[#5c9dff]" />
                <span className="font-medium text-[16px] text-[#5c9dff]">Integrations</span>
              </div>
              <ChevronRight size={20} className="text-[var(--text-placeholder)]" />
            </button>
          </div>

          {/* Card 2: Gallery */}
          <div className="bg-[var(--bg-tertiary)] rounded-2xl mb-4 flex flex-col">
            <button
              onClick={() => { onClose(); onOpenGallery(); }}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <GalleryHorizontalEnd size={18} className="text-[var(--text-secondary)]" />
                <span className="font-medium text-[16px] text-[var(--text-primary)]">Gallery</span>
              </div>
              <ChevronRight size={20} className="text-[var(--text-placeholder)]" />
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="bg-[var(--bg-tertiary)] rounded-2xl flex-1 flex flex-col overflow-hidden mb-4">
          {/* Header — hide when search is active (list takes full space) */}
          {!searchActive && (
            multiSelect ? (
              <div className="flex items-center justify-between p-4 border-b border-[var(--bg-elevated)]">
                <button onClick={toggleSelectAll} className="flex items-center gap-2.5 text-[var(--text-primary)] text-[16px]">
                  {selected.size === conversations.length ? (
                    <div className="w-[22px] h-[22px] rounded-full bg-[#2196F3] flex items-center justify-center">
                      <Check size={14} strokeWidth={2.5} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-[22px] h-[22px] rounded-full border-2 border-[var(--text-placeholder)]" />
                  )}
                  Select all
                </button>
                <div className="flex items-center gap-5">
                  <button onClick={() => { setMultiSelect(false); setSelected(new Set()); }} className="text-[16px] text-[var(--text-primary)]">Cancel</button>
                  <button onClick={handleMultiSelectDelete} disabled={selected.size === 0}
                    className={`text-[16px] font-medium ${selected.size > 0 ? 'text-red-400' : 'text-red-400/40'}`}>Delete</button>
                </div>
              </div>
            ) : (
              <div className="px-4 pt-3 pb-2">
                <span className="text-[var(--text-secondary)] text-[12px] font-medium uppercase tracking-wider">History</span>
              </div>
            )
          )}

          <div ref={historyScrollRef} className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-3 relative">
            <div className="flex flex-col">
              {filteredConversations.length === 0 ? (
                <p className="text-[14px] text-[var(--text-placeholder)] py-4 px-1">
                  {searchActive ? 'No results' : 'No conversations yet'}
                </p>
              ) : (
                filteredConversations.map((c) => {
                  const isContextTarget = contextMenu?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (multiSelect) { toggleSelect(c.id); }
                        else { navigate(`/m/chat/${c.id}`); }
                      }}
                      onContextMenu={(e) => { if (!multiSelect) handleContextMenuEvent(c, e); }}
                      onTouchStart={(e) => { if (!multiSelect) handleTouchStart(c, e); }}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchEnd}
                      className={`flex items-center gap-3 py-3 px-1 text-left transition-colors rounded-xl ${
                        isContextTarget ? 'bg-[var(--sidebar-item-active)]/70 relative z-[95] shadow-lg px-3' : ''
                      }`}
                    >
                      {multiSelect && (
                        selected.has(c.id) ? (
                          <div className="w-[22px] h-[22px] rounded-full bg-[#2196F3] flex items-center justify-center shrink-0">
                            <Check size={14} strokeWidth={2.5} className="text-white" />
                          </div>
                        ) : (
                          <div className="w-[22px] h-[22px] rounded-full border-2 border-[var(--text-placeholder)] shrink-0" />
                        )
                      )}
                      <span className="text-[16px] text-[var(--text-primary)] truncate">{c.title || 'New Chat'}</span>
                    </button>
                  );
                })
              )}
            </div>

            {contextMenu && contextConv && (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onRename={() => handleRename(contextConv)}
                onMultiSelect={() => { setMultiSelect(true); setSelected(new Set([contextConv.id])); }}
                onPin={() => {}}
                onDelete={() => handleDelete([contextConv.id])}
                onClose={() => setContextMenu(null)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      {renaming && (
        <RenameDialog
          initialTitle={renaming.title || 'New Chat'}
          onSave={handleRenameSave}
          onCancel={() => setRenaming(null)}
        />
      )}
    </div>
  );
}

/* ─── Theme Segmented Control ─────────────────────────────── */

function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'system', icon: Monitor, label: 'System' },
    { value: 'dark', icon: Moon, label: 'Dark' },
  ] as const;

  return (
    <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-page)]">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-all ${
              isActive
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-subtle)]'
            }`}
          >
            <Icon size={14} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Settings Overlay ───────────────────────────────────── */

export function MobileSettingsOverlay({ onClose }: { onClose: () => void }) {
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  return (
    <div className="absolute inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--overlay)] transition-opacity"
        onClick={onClose}
      />

      {/* Settings Panel — slides in from right */}
      <div className="w-full bg-[var(--bg-page)] h-full relative z-10 flex flex-col animate-slide-left shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 pt-12">
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg font-medium">Settings</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
          {/* Profile Card */}
          <div className="bg-[var(--bg-tertiary)] rounded-2xl p-4 flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
              <User size={28} className="text-[var(--text-secondary)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-medium text-[var(--text-primary)]">User</span>
              <span className="text-[13px] text-[var(--text-placeholder)]">Manage your account</span>
            </div>
          </div>

          {/* Settings sections */}
          <div className="bg-[var(--bg-tertiary)] rounded-2xl flex flex-col divide-y divide-[var(--bg-elevated)]">
            {['General', 'Appearance', 'Notifications', 'Data & Privacy', 'About'].map((item) => (
              <div key={item}>
                <button
                  onClick={item === 'Appearance' ? () => setAppearanceOpen(!appearanceOpen) : undefined}
                  className="flex items-center justify-between p-4 text-[var(--text-primary)] text-[15px] w-full"
                >
                  {item}
                  <ChevronRight
                    size={18}
                    className={`text-[var(--text-placeholder)] transition-transform ${
                      item === 'Appearance' && appearanceOpen ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {item === 'Appearance' && appearanceOpen && (
                  <div className="px-4 pb-4">
                    <ThemeSegmentedControl />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Gallery Overlay ────────────────────────────────────── */

interface GalleryImageItem {
  id: string;
  url: string | null;
  fileName: string | null;
  prompt: string | undefined;
  model: string | undefined;
  createdAt: string;
}

function formatGalleryDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function GalleryImageCard({ image, onClick }: { image: GalleryImageItem; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return (
    <button
      className="relative overflow-hidden rounded-xl bg-[var(--bg-elevated)] active:scale-95 transition-transform duration-150"
      style={{ aspectRatio: '1/1' }}
      onClick={onClick}
    >
      {!loaded && !error && <div className="absolute inset-0 animate-pulse bg-[var(--sidebar-item-active)]" />}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <GalleryHorizontalEnd size={18} className="text-[var(--text-placeholder)]" />
        </div>
      ) : image.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={image.prompt ?? 'Generated image'}
          className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      ) : null}
    </button>
  );
}

function GalleryLightbox({
  image,
  total,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  image: GalleryImageItem;
  total: number;
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-[var(--bg-page)]">
      <div className="flex items-center justify-between px-4 py-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <button onClick={onClose} className="p-2 -ml-2"><X size={22} className="text-[var(--text-secondary)]" /></button>
        <span className="text-[13px] text-[var(--text-subtle)]">{index + 1} / {total}</span>
        {image.url && (
          <a href={image.url} download={image.fileName ?? 'image.png'} className="p-2 -mr-2">
            <Download size={20} className="text-[var(--text-secondary)]" />
          </a>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center relative px-4">
        {index > 0 && (
          <button onClick={onPrev} className="absolute left-2 z-10 p-2 rounded-full bg-[var(--overlay)]">
            <ChevronLeft size={22} className="text-[var(--text-primary)]" />
          </button>
        )}
        {index < total - 1 && (
          <button onClick={onNext} className="absolute right-2 z-10 p-2 rounded-full bg-[var(--overlay)]">
            <ChevronRight size={22} className="text-[var(--text-primary)]" />
          </button>
        )}
        {image.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.prompt ?? 'Generated image'} className="max-w-full max-h-full rounded-xl object-contain" />
        )}
      </div>
      <div className="px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        {image.prompt && <p className="text-[14px] text-[var(--text-primary)] leading-relaxed mb-1 line-clamp-3">{image.prompt}</p>}
        <p className="text-[12px] text-[var(--text-placeholder)]">{formatGalleryDate(image.createdAt)}</p>
      </div>
    </div>
  );
}

export function MobileGalleryOverlay({ onClose, onOpenSidebar }: { onClose: () => void; onOpenSidebar: () => void }) {
  const [images, setImages] = useState<GalleryImageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const LIMIT = 24;

  const fetchImages = useCallback(async (offset = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/images?limit=${LIMIT}&offset=${offset}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setImages((prev) => append ? [...prev, ...data.images] : data.images);
      setTotal(data.total);
    } catch {}
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--bg-page)] animate-slide-left">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b border-[var(--border-default)]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <button onClick={onOpenSidebar} className="p-1 -ml-1 text-[var(--text-secondary)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="3" y1="15" x2="14" y2="15" />
          </svg>
        </button>
        <span className="text-[18px] font-semibold flex-1">Gallery</span>
        {!loading && <span className="text-[13px] text-[var(--text-placeholder)]">{total} image{total !== 1 ? 's' : ''}</span>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="grid grid-cols-3 gap-1 p-1 pt-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[var(--bg-tertiary)] animate-pulse" style={{ aspectRatio: '1/1' }} />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
              <GalleryHorizontalEnd size={26} className="text-[var(--text-subtle)]" />
            </div>
            <div>
              <p className="text-[17px] font-semibold text-[var(--text-primary)] mb-1">No images yet</p>
              <p className="text-[14px] text-[var(--text-placeholder)]">Ask ELK to generate an image.</p>
            </div>
          </div>
        ) : (
          <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
            <div className="grid grid-cols-3 gap-1 p-1 pt-2">
              {images.map((image, idx) => (
                <GalleryImageCard key={image.id} image={image} onClick={() => setLightboxIndex(idx)} />
              ))}
            </div>
            {images.length < total && (
              <div className="px-4 mt-3">
                <button
                  onClick={() => fetchImages(images.length, true)}
                  disabled={loadingMore}
                  className="w-full py-3 rounded-2xl bg-[var(--bg-tertiary)] text-[15px] text-[var(--text-secondary)] active:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <GalleryLightbox
          image={images[lightboxIndex]}
          total={images.length}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setLightboxIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : i))}
        />
      )}
    </div>
  );
}
