'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  ChevronLeft,
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

/* ─── iOS Context Menu Overlay ───────────────────────────── */

function IOSContextMenu({
  title,
  rect,
  onRename,
  onMultiSelect,
  onPin,
  onDelete,
  onClose,
}: {
  title: string;
  rect: DOMRect;
  onRename: () => void;
  onMultiSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const items = [
    { label: 'Rename',       icon: <Pencil size={18} />,         action: onRename,      danger: false },
    { label: 'Multi-select', icon: <ListFilter size={18} />,     action: onMultiSelect, danger: false },
    { label: 'Pin to top',   icon: <ArrowUpFromDot size={18} />, action: onPin,         danger: false },
    { label: 'Delete',       icon: <Trash2 size={18} />,         action: onDelete,      danger: true  },
  ];

  const nearBottom = rect.top > window.innerHeight - 250;
  const positionStyle: React.CSSProperties = nearBottom
    ? { bottom: window.innerHeight - rect.bottom }
    : { top: rect.top };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className={`absolute flex ${nearBottom ? 'flex-col-reverse' : 'flex-col'} gap-2`}
        style={{ left: rect.left, width: rect.width, ...positionStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title card — always sits over the original button */}
        <div className="bg-[var(--bg-elevated)] px-4 py-3.5 rounded-2xl shadow-2xl shrink-0">
          <span className="text-[var(--text-primary)] text-[15px] font-medium truncate block">{title}</span>
        </div>

        {/* Options card — drops down or pops up depending on flex direction */}
        <div className="bg-[var(--bg-elevated)] rounded-2xl shadow-2xl overflow-hidden">
          {items.map((item, i) => (
            <div key={item.label}>
              <button
                className={`flex items-center justify-between w-full px-4 py-3.5 active:bg-[var(--sidebar-item-hover)] transition-colors ${
                  item.danger ? 'text-[#ff453a]' : 'text-[var(--text-primary)]'
                }`}
                onClick={() => { item.action(); onClose(); }}
              >
                <span className="text-[16px]">{item.label}</span>
                <span className={item.danger ? 'text-[#ff453a]' : 'text-[var(--text-secondary)]'}>{item.icon}</span>
              </button>
              {i < items.length - 1 && (
                <div className="h-px bg-[var(--border-subtle)]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
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

/* ─── Conversation Item ──────────────────────────────────── */

function ConversationItem({
  conv,
  multiSelect,
  selected,
  onNavigate,
  onToggle,
  onLongPress,
}: {
  conv: Conversation;
  multiSelect: boolean;
  selected: boolean;
  onNavigate: () => void;
  onToggle: () => void;
  onLongPress: (id: string, rect: DOMRect) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStart = () => {
    if (multiSelect || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    timerRef.current = setTimeout(() => {
      onLongPress(conv.id, rect);
    }, 500);
  };

  const handleEnd = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (multiSelect || !buttonRef.current) return;
    e.preventDefault();
    const rect = buttonRef.current.getBoundingClientRect();
    onLongPress(conv.id, rect);
  };

  return (
    <button
      ref={buttonRef}
      onClick={() => { multiSelect ? onToggle() : onNavigate(); }}
      onContextMenu={handleContextMenu}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchMove={handleEnd}
      className="flex items-center gap-3 py-3 px-1 text-left transition-colors rounded-xl select-none"
    >
      {multiSelect && (
        selected ? (
          <div className="w-[22px] h-[22px] rounded-full bg-[#2196F3] flex items-center justify-center shrink-0">
            <Check size={14} strokeWidth={2.5} className="text-white" />
          </div>
        ) : (
          <div className="w-[22px] h-[22px] rounded-full border-2 border-[var(--text-placeholder)] shrink-0" />
        )
      )}
      <span className="text-[16px] text-[var(--text-primary)] truncate">{conv.title || 'New Chat'}</span>
    </button>
  );
}

/* ─── Main Sidebar ───────────────────────────────────────── */

export function MobileSidebar({ onClose, onOpenSettings, onOpenGallery }: { onClose: () => void; onOpenSettings: () => void; onOpenGallery: () => void }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [contextMenu, setContextMenu] = useState<{ id: string; rect: DOMRect } | null>(null);
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

  const handleLongPress = useCallback((id: string, rect: DOMRect) => {
    setContextMenu({ id, rect });
  }, []);

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
                filteredConversations.map((c) => (
                  <ConversationItem
                    key={c.id}
                    conv={c}
                    multiSelect={multiSelect}
                    selected={selected.has(c.id)}
                    onNavigate={() => navigate(`/m/chat/${c.id}`)}
                    onToggle={() => toggleSelect(c.id)}
                    onLongPress={handleLongPress}
                  />
                ))
              )}
            </div>

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

      {/* iOS Context Menu — fixed over everything */}
      {contextMenu && contextConv && (
        <IOSContextMenu
          title={contextConv.title || 'New Chat'}
          rect={contextMenu.rect}
          onRename={() => handleRename(contextConv)}
          onMultiSelect={() => { setMultiSelect(true); setSelected(new Set([contextConv.id])); }}
          onPin={() => {}}
          onDelete={() => handleDelete([contextConv.id])}
          onClose={() => setContextMenu(null)}
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

function GalleryImageCard({ image, onClick, selectMode, selected, onToggleSelect }: { image: GalleryImageItem; onClick: () => void; selectMode?: boolean; selected?: boolean; onToggleSelect?: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return (
    <button
      className="relative overflow-hidden rounded-xl bg-[var(--bg-elevated)] active:scale-95 transition-transform duration-150"
      style={{ aspectRatio: '1/1' }}
      onClick={selectMode ? onToggleSelect : onClick}
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
      {selectMode && (
        <div className="absolute top-1.5 right-1.5">
          {selected ? (
            <CheckCircle2 size={22} className="text-blue-500 drop-shadow-md" fill="white" />
          ) : (
            <Circle size={22} className="text-white/60 drop-shadow-md" />
          )}
        </div>
      )}
      {selectMode && selected && (
        <div className="absolute inset-0 bg-blue-500/20 rounded-xl" />
      )}
    </button>
  );
}

function GalleryLightbox({
  images,
  index,
  onClose,
  onChangeIndex,
}: {
  images: GalleryImageItem[];
  index: number;
  onClose: () => void;
  onChangeIndex: (i: number) => void;
}) {
  const total = images.length;
  const prevImg = index > 0 ? images[index - 1] : null;
  const currImg = images[index];
  const nextImg = index < total - 1 ? images[index + 1] : null;

  // Refs for direct DOM manipulation during drag (no re-render per frame)
  const prevSlotRef = useRef<HTMLDivElement>(null);
  const currSlotRef = useRef<HTMLDivElement>(null);
  const nextSlotRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const animatingRef = useRef(false);

  const EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  const DURATION = 260;

  const setPositions = useCallback((dx: number, transition = false) => {
    const tr = transition ? `transform ${DURATION}ms ${EASING}` : 'none';
    if (prevSlotRef.current) {
      prevSlotRef.current.style.transition = tr;
      prevSlotRef.current.style.transform = `translateX(calc(-100% + ${dx}px))`;
    }
    if (currSlotRef.current) {
      currSlotRef.current.style.transition = tr;
      currSlotRef.current.style.transform = `translateX(${dx}px)`;
    }
    if (nextSlotRef.current) {
      nextSlotRef.current.style.transition = tr;
      nextSlotRef.current.style.transform = `translateX(calc(100% + ${dx}px))`;
    }
  }, []);

  // Reset to center whenever index changes (new images mounted)
  useEffect(() => {
    setPositions(0);
  }, [index, setPositions]);

  const navigate = useCallback((dir: 'prev' | 'next') => {
    if (animatingRef.current) return;
    if (dir === 'prev' && !prevImg) return;
    if (dir === 'next' && !nextImg) return;
    animatingRef.current = true;
    const target = dir === 'prev' ? window.innerWidth : -window.innerWidth;
    setPositions(target, true);
    setTimeout(() => {
      onChangeIndex(dir === 'prev' ? index - 1 : index + 1);
      animatingRef.current = false;
    }, DURATION);
  }, [prevImg, nextImg, index, onChangeIndex, setPositions]);

  const snapBack = useCallback(() => {
    setPositions(0, true);
    setTimeout(() => { animatingRef.current = false; }, DURATION);
  }, [setPositions]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (animatingRef.current) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || animatingRef.current) return;
    let dx = e.touches[0].clientX - touchStartX.current;
    // Rubber-band resistance at edges
    if ((dx > 0 && !prevImg) || (dx < 0 && !nextImg)) dx *= 0.15;
    setPositions(dx);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx > 60 && prevImg) navigate('prev');
    else if (dx < -60 && nextImg) navigate('next');
    else snapBack();
  };

  // Dot indicators — show up to 7, sliding window when more
  const MAX_DOTS = 7;
  const dotWindowStart = total <= MAX_DOTS ? 0 : Math.max(0, Math.min(index - Math.floor(MAX_DOTS / 2), total - MAX_DOTS));
  const dotCount = Math.min(total, MAX_DOTS);

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col bg-[var(--bg-page)]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <button onClick={onClose} className="p-2 -ml-2">
          <X size={22} className="text-[var(--text-secondary)]" />
        </button>
        <span className="text-[13px] text-[var(--text-subtle)]">{index + 1} / {total}</span>
        {currImg?.url ? (
          <a href={currImg.url} download={currImg.fileName ?? 'image.png'} className="p-2 -mr-2">
            <Download size={20} className="text-[var(--text-secondary)]" />
          </a>
        ) : <div className="w-10" />}
      </div>

      {/* Image area — 3 absolutely-positioned slots */}
      <div className="flex-1 relative overflow-hidden">
        {/* Prev slot */}
        <div
          ref={prevSlotRef}
          className="absolute inset-0 flex items-center justify-center px-4"
          style={{ transform: 'translateX(-100%)' }}
        >
          {prevImg?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={prevImg.url} alt={prevImg.prompt ?? ''} className="max-w-full max-h-full rounded-2xl object-contain" />
          )}
        </div>
        {/* Current slot */}
        <div
          ref={currSlotRef}
          className="absolute inset-0 flex items-center justify-center px-4"
          style={{ transform: 'translateX(0px)' }}
        >
          {currImg?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currImg.url} alt={currImg.prompt ?? ''} className="max-w-full max-h-full rounded-2xl object-contain" />
          )}
        </div>
        {/* Next slot */}
        <div
          ref={nextSlotRef}
          className="absolute inset-0 flex items-center justify-center px-4"
          style={{ transform: 'translateX(100%)' }}
        >
          {nextImg?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nextImg.url} alt={nextImg.prompt ?? ''} className="max-w-full max-h-full rounded-2xl object-contain" />
          )}
        </div>

        {/* Prev arrow */}
        {prevImg && (
          <button
            onClick={() => navigate('prev')}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-opacity active:opacity-60"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
          >
            <ChevronLeft size={20} className="text-[var(--text-primary)]" />
          </button>
        )}
        {/* Next arrow */}
        {nextImg && (
          <button
            onClick={() => navigate('next')}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-opacity active:opacity-60"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
          >
            <ChevronRight size={20} className="text-[var(--text-primary)]" />
          </button>
        )}
      </div>

      {/* Dots + caption */}
      <div className="px-4 flex-shrink-0" style={{ paddingTop: 12, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        {/* Dot indicators */}
        {total > 1 && (
          <div className="flex justify-center items-center gap-[5px] mb-3">
            {Array.from({ length: dotCount }, (_, i) => {
              const dotIdx = dotWindowStart + i;
              const isActive = dotIdx === index;
              return (
                <button
                  key={dotIdx}
                  onClick={() => !animatingRef.current && onChangeIndex(dotIdx)}
                  className="transition-all duration-200"
                  style={{
                    width: isActive ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: isActive ? 'var(--text-primary)' : 'var(--text-subtle)',
                    opacity: isActive ? 1 : 0.35,
                    flexShrink: 0,
                  }}
                />
              );
            })}
          </div>
        )}
        {currImg?.prompt && (
          <p className="text-[14px] text-[var(--text-primary)] leading-relaxed mb-1 line-clamp-3">{currImg.prompt}</p>
        )}
        <p className="text-[12px] text-[var(--text-placeholder)]">{formatGalleryDate(currImg?.createdAt ?? '')}</p>
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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const LIMIT = 24;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === images.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(images.map((img) => img.id)));
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => !selectedIds.has(img.id)));
        setTotal((prev) => prev - selectedIds.size);
        exitSelectMode();
      }
    } catch (err) {
      console.error('Failed to delete images:', err);
    } finally {
      setDeleting(false);
    }
  };

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
        {selectMode ? (
          <>
            <button onClick={exitSelectMode} className="text-[15px] text-[var(--text-secondary)]">Cancel</button>
            <span className="text-[18px] font-semibold flex-1 text-center">{selectedIds.size} selected</span>
            <button onClick={selectAll} className="text-[15px] text-blue-500">
              {selectedIds.size === images.length ? 'Deselect All' : 'Select All'}
            </button>
          </>
        ) : (
          <>
            <button onClick={onOpenSidebar} className="p-1 -ml-1 text-[var(--text-secondary)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="3" y1="15" x2="14" y2="15" />
              </svg>
            </button>
            <span className="text-[18px] font-semibold flex-1">Gallery</span>
            {!loading && images.length > 0 && (
              <button onClick={() => setSelectMode(true)} className="text-[15px] text-blue-500">Select</button>
            )}
          </>
        )}
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
                <GalleryImageCard
                  key={image.id}
                  image={image}
                  onClick={() => setLightboxIndex(idx)}
                  selectMode={selectMode}
                  selected={selectedIds.has(image.id)}
                  onToggleSelect={() => toggleSelect(image.id)}
                />
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

      {/* Delete footer */}
      {selectMode && selectedIds.size > 0 && (
        <div
          className="flex-shrink-0 border-t border-[var(--border-default)] px-4 py-3 flex items-center justify-center"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500 text-white text-[15px] font-medium active:bg-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 size={18} />
            {deleting ? 'Deleting...' : `Delete ${selectedIds.size} image${selectedIds.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <GalleryLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChangeIndex={(i) => setLightboxIndex(i)}
        />
      )}
    </div>
  );
}
