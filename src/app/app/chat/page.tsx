'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, Trash2, MessageSquare, CheckSquare, Square, ExternalLink, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/client';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from '@/components/chat/message-bubble';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

type Conversation = {
  id: string;
  title: string | null;
  preview: string | null;
  updated_at: string;
};

function getTimeGroup(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'Previous 7 Days';
  return 'Older';
}

function getDisplayTitle(conv: Conversation): string {
  if (conv.title && conv.title !== 'New Chat') return conv.title;
  if (conv.preview) return conv.preview;
  return 'New Chat';
}

function groupByTime(conversations: Conversation[]): { label: string; items: Conversation[] }[] {
  const groups = new Map<string, Conversation[]>();
  const order = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];

  for (const conv of conversations) {
    const group = getTimeGroup(conv.updated_at);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(conv);
  }

  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ label, items: groups.get(label)! }));
}

export default function ChatListPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: conversations, isLoading } = trpc.chat.listConversations.useQuery({ limit: 50 });

  const { data: selectedConversation, isLoading: isLoadingConversation } = trpc.chat.getConversation.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  const createConversation = trpc.chat.createConversation.useMutation({
    onSuccess: (data) => {
      router.push(`/app/chat/${data.id}`);
    },
  });

  const deleteConversation = trpc.chat.deleteConversation.useMutation({
    onSuccess: () => {
      utils.chat.listConversations.invalidate();
    },
  });

  const handleNewChat = () => {
    createConversation.mutate({});
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this conversation? This cannot be undone.')) {
      if (selectedId === id) setSelectedId(null);
      deleteConversation.mutate({ id });
    }
  };

  const handleSelect = (id: string) => {
    if (!selectMode) {
      setSelectedId(id);
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} conversation${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    for (const id of selectedIds) {
      if (selectedId === id) setSelectedId(null);
      deleteConversation.mutate({ id });
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const toggleSelectMode = useCallback(() => {
    setSelectMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const filtered = useMemo(() => {
    const items = (conversations ?? []) as Conversation[];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((c) => getDisplayTitle(c).toLowerCase().includes(q));
  }, [conversations, search]);

  const grouped = useMemo(() => groupByTime(filtered), [filtered]);

  const previewMessages: { id: string; role: 'user' | 'assistant'; content: string }[] = useMemo(() => {
    if (!selectedConversation?.messages) return [];
    return selectedConversation.messages.map((m: { id: string; role: string; content: string }) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }, [selectedConversation?.messages]);

  const previewTitle = useMemo(() => {
    if (!selectedConversation) return '';
    const conv = selectedConversation as Conversation;
    return getDisplayTitle(conv);
  }, [selectedConversation]);

  const hasConversations = conversations && conversations.length > 0;

  return (
    <div className="flex h-full">
      {/* ─── LEFT PANEL ─── */}
      <div
        className="flex flex-col flex-shrink-0 h-full"
        style={{
          width: '400px',
          background: 'var(--surface-glass-subtle)',
          borderRight: '1px solid var(--border-default)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
            Chats
          </h1>
          <button
            onClick={handleNewChat}
            disabled={createConversation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150"
            style={{
              background: 'var(--surface-glass)',
              border: '1px solid var(--surface-glass-border)',
              color: 'var(--text-primary)',
              opacity: createConversation.isPending ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-glass-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-glass)'; }}
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            New Chat
          </button>
        </div>

        {/* Search + Select toggle */}
        <div className="px-4 pb-3 flex-shrink-0 flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              strokeWidth={1.5}
              style={{ color: 'var(--text-tertiary)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg outline-none transition-all duration-200"
              style={{
                background: 'var(--surface-glass)',
                border: '1px solid var(--surface-glass-border)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--input-border-focus)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--surface-glass-border)'; }}
            />
          </div>
          {hasConversations && (
            <button
              onClick={toggleSelectMode}
              className="flex-shrink-0 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all duration-150"
              style={{
                background: selectMode ? 'var(--accent-bg)' : 'transparent',
                border: selectMode ? '1px solid var(--accent-border)' : '1px solid transparent',
                color: selectMode ? 'var(--accent-text)' : 'var(--text-tertiary)',
              }}
              onMouseEnter={(e) => { if (!selectMode) e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={(e) => { if (!selectMode) e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              Select
            </button>
          )}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ scrollbarWidth: 'thin' }}>
          {isLoading ? (
            <div className="space-y-3 px-1 mt-1">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : !hasConversations ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface-glass)', border: '1px solid var(--surface-glass-border)' }}
              >
                <MessageSquare className="w-5 h-5" strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  No conversations yet
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Start a new chat to get going.
                </p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                No conversations matching &ldquo;{search}&rdquo;
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.label}>
                  <p
                    className="text-[11px] font-medium tracking-wider uppercase px-2 pb-1"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {group.label}
                  </p>
                  <div className="space-y-px">
                    {group.items.map((conv) => {
                      const isActive = selectedId === conv.id && !selectMode;
                      const isChecked = selectedIds.has(conv.id);
                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          key={conv.id}
                          onClick={() => handleSelect(conv.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(conv.id); }}
                          className="group w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-150 text-left cursor-pointer"
                          style={{
                            background: isActive ? 'var(--surface-glass)' : 'transparent',
                            border: isActive ? '1px solid var(--surface-glass-border)' : '1px solid transparent',
                          }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--surface-glass-subtle)'; }}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'var(--surface-glass)' : 'transparent'; }}
                        >
                          {/* Checkbox in select mode */}
                          {selectMode && (
                            <div className="flex-shrink-0" style={{ color: isChecked ? 'var(--accent-text)' : 'var(--text-tertiary)' }}>
                              {isChecked
                                ? <CheckSquare className="w-4 h-4" strokeWidth={1.5} />
                                : <Square className="w-4 h-4" strokeWidth={1.5} />}
                            </div>
                          )}

                          {/* Title */}
                          <span
                            className="text-[13px] truncate flex-1 min-w-0"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {getDisplayTitle(conv)}
                          </span>

                          {/* Time + delete */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                              {formatRelativeTime(conv.updated_at)}
                            </span>
                            {!selectMode && (
                              <button
                                onClick={(e) => handleDelete(e, conv.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all duration-150"
                                style={{ color: 'var(--text-tertiary)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                              >
                                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Select mode action bar */}
        {selectMode && (
          <div
            className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const allIds = new Set(filtered.map((c) => c.id));
                  setSelectedIds((prev) => prev.size === allIds.size ? new Set() : allIds);
                }}
                className="text-[12px] font-medium transition-colors duration-150"
                style={{ color: 'var(--accent-text)' }}
              >
                {selectedIds.size === filtered.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                · {selectedIds.size} selected
              </span>
            </div>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
              style={{
                background: selectedIds.size > 0 ? 'rgba(239,68,68,0.1)' : 'transparent',
                border: selectedIds.size > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent',
                color: selectedIds.size > 0 ? 'var(--error)' : 'var(--text-tertiary)',
                cursor: selectedIds.size > 0 ? 'pointer' : 'default',
              }}
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {!selectedId ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--surface-glass)', border: '1px solid var(--surface-glass-border)' }}
            >
              <MessageSquare className="w-5 h-5" strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
              Select a conversation to preview
            </p>
          </div>
        ) : isLoadingConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : (
          <>
            {/* Preview header */}
            <div
              className="flex items-center justify-between h-[48px] px-5 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border-default)' }}
            >
              <span className="text-[14px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {previewTitle}
              </span>
              <Link
                href={`/app/chat/${selectedId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
                style={{
                  background: 'var(--surface-glass)',
                  border: '1px solid var(--surface-glass-border)',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-glass-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-glass)'; }}
              >
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                Open Chat
              </Link>
            </div>

            {/* Messages preview */}
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'thin' }}>
              {previewMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                    No messages in this conversation.
                  </p>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-4">
                  {previewMessages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
