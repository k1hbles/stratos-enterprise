'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Search,
  Music,
  FileSpreadsheet,
  Presentation,
  User,
  Settings,
  Pencil,
  ListFilter,
  ArrowUpFromDot,
  Trash2,
  Circle,
  CheckCircle2,
} from 'lucide-react';

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

  // Clamp menu position so it doesn't overflow
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
      {/* Blur backdrop */}
      <div className="absolute inset-0 z-[90] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div ref={menuRef} style={menuStyle} className="z-[100] w-[220px] bg-[#2c2c2e] rounded-xl overflow-hidden shadow-2xl">
        {items.map((item, i) => (
          <button
            key={item.label}
            onClick={() => {
              item.action();
              onClose();
            }}
            className={`flex items-center justify-between w-full px-4 py-3.5 text-[15px] transition-colors active:bg-[#3a3a3c] ${
              item.danger ? 'text-red-400' : 'text-gray-200'
            } ${i < items.length - 1 ? 'border-b border-[#3a3a3c]' : ''}`}
          >
            <span>{item.label}</span>
            <span className={item.danger ? 'text-red-400' : 'text-gray-400'}>{item.icon}</span>
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
      <div className="absolute inset-0 z-[90] bg-black/50" onClick={onCancel} />
      <div className="absolute inset-0 z-[100] flex items-center justify-center px-8">
        <div className="bg-[#2c2c2e] rounded-2xl p-5 w-full max-w-[300px] flex flex-col gap-4">
          <span className="text-[16px] font-medium text-gray-200">Rename conversation</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(value.trim());
              if (e.key === 'Escape') onCancel();
            }}
            className="bg-[#1c1c1e] text-white rounded-lg px-3 py-2.5 text-[15px] outline-none border border-[#3a3a3c] focus:border-[#5c9dff]"
          />
          <div className="flex justify-end gap-3">
            <button onClick={onCancel} className="text-[14px] text-gray-400 px-3 py-1.5">
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

export function MobileSidebar({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyScrollRef = useRef<HTMLDivElement>(null);

  // Multi-select state
  const [multiSelect, setMultiSelect] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Rename state
  const [renaming, setRenaming] = useState<Conversation | null>(null);

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

  /* ── Long press handlers ── */

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

  /* ── Actions ── */

  const handleRename = useCallback((conv: Conversation) => {
    setRenaming(conv);
  }, []);

  const handleRenameSave = useCallback(async (title: string) => {
    if (!renaming || !title) return;
    try {
      await fetch(`/api/conversations/${renaming.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === renaming.id ? { ...c, title } : c))
      );
    } catch {}
    setRenaming(null);
  }, [renaming]);

  const handleDelete = useCallback(async (ids: string[]) => {
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/conversations/${id}`, { method: 'DELETE' }).catch(() => {})
      )
    );
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === conversations.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(conversations.map((c) => c.id)));
    }
  }, [selected.size, conversations]);

  const contextConv = contextMenu ? conversations.find((c) => c.id === contextMenu.id) : null;

  return (
    <div className="absolute inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Content */}
      <div className="w-[85%] max-w-[340px] bg-[#0f0f0f] h-full relative z-10 flex flex-col p-4 pt-12 animate-slide-right shadow-2xl">

        {/* Card 1: Profile & Explore */}
        <div className="bg-[#1c1c1e] rounded-2xl mb-4 flex flex-col">
          <button
            onClick={() => navigate('/m/settings')}
            className="flex items-center justify-between p-4 border-b border-[#2c2c2e]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2c2c2e] flex items-center justify-center">
                <User size={20} className="text-gray-300" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium text-[16px] text-gray-200">My Profile</span>
                <span className="text-[12px] text-gray-500">Settings</span>
              </div>
            </div>
            <Settings size={18} className="text-gray-500" />
          </button>
          <button
            onClick={() => navigate('/m/council')}
            className="flex items-center justify-between p-4"
          >
            <span className="font-medium text-[16px] text-gray-200">Explore Stratos+</span>
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Card 2: Free Trial */}
        <div className="bg-[#1c1c1e] rounded-2xl mb-4 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[#5c9dff]">
            <Music size={20} />
            <span className="font-medium text-[16px]">Start free trial</span>
          </div>
          <ChevronRight size={20} className="text-gray-500" />
        </div>

        {/* Card 3: Chat History */}
        <div className="bg-[#1c1c1e] rounded-2xl flex-1 flex flex-col overflow-hidden mb-4">
          {/* Header — switches between normal and multi-select mode */}
          {multiSelect ? (
            <div className="flex items-center justify-between p-4 border-b border-[#2c2c2e]">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-gray-200 text-[15px]">
                {selected.size === conversations.length ? (
                  <CheckCircle2 size={20} className="text-[#5c9dff]" />
                ) : (
                  <Circle size={20} className="text-gray-500" />
                )}
                Select all
              </button>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setMultiSelect(false); setSelected(new Set()); }}
                  className="text-[15px] text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMultiSelectDelete}
                  className={`text-[15px] font-medium ${selected.size > 0 ? 'text-red-400' : 'text-red-400/40'}`}
                  disabled={selected.size === 0}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border-b border-[#2c2c2e]">
              <span className="text-gray-200 font-medium text-[16px]">Chat history</span>
              <div className="flex items-center gap-1.5 bg-[#2c2c2e] px-3 py-1.5 rounded-full text-xs text-gray-400">
                <Search size={14} /> Search
              </div>
            </div>
          )}

          <div ref={historyScrollRef} className="flex-1 overflow-y-auto scrollbar-hide p-4 pt-5 relative">
            <div className="text-[14px] text-gray-500 mb-4 font-medium">Last 30 days</div>

            <div className="flex flex-col gap-1">
              {conversations.map((c) => {
                const isContextTarget = contextMenu?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (multiSelect) {
                        toggleSelect(c.id);
                      } else {
                        navigate(`/m/chat/${c.id}`);
                      }
                    }}
                    onContextMenu={(e) => {
                      if (!multiSelect) handleContextMenuEvent(c, e);
                    }}
                    onTouchStart={(e) => {
                      if (!multiSelect) handleTouchStart(c, e);
                    }}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    className={`flex items-center gap-3 py-3 text-gray-300 rounded-xl px-2 -mx-2 transition-colors text-left ${
                      isContextTarget
                        ? 'bg-[#2c2c2e] relative z-[95] shadow-lg ring-1 ring-[#3a3a3c]'
                        : 'hover:bg-[#2c2c2e]'
                    }`}
                  >
                    {multiSelect && (
                      selected.has(c.id) ? (
                        <CheckCircle2 size={20} className="text-[#5c9dff] shrink-0" />
                      ) : (
                        <Circle size={20} className="text-gray-500 shrink-0" />
                      )
                    )}
                    {!multiSelect && getIconForTitle(c.title) && (
                      <span className="text-gray-400">{getIconForTitle(c.title)}</span>
                    )}
                    <span className="text-[15px] truncate">{c.title || 'New Chat'}</span>
                  </button>
                );
              })}
              {conversations.length === 0 && (
                <p className="text-[13px] text-gray-500 px-2 py-4">No conversations yet</p>
              )}
            </div>

            {/* Context Menu */}
            {contextMenu && contextConv && (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onRename={() => handleRename(contextConv)}
                onMultiSelect={() => { setMultiSelect(true); setSelected(new Set([contextConv.id])); }}
                onPin={() => {/* Pin logic — stub for now */}}
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
