'use client';

import { use, Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronDown, Pencil, Trash2, Loader2 } from 'lucide-react';
import { trpc } from '@/trpc/client';
import { ConversationView } from '@/components/chat/conversation-view';
import type { ChatMode } from '@/components/chat/message-input';

function TitleDropdown({
  title,
  onRename,
  onDelete,
}: {
  title: string;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    };
    if (open || editing) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      onRename(trimmed);
    } else {
      setEditValue(title);
    }
    setEditing(false);
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') { setEditing(false); setOpen(false); setEditValue(title); }
          }}
          onBlur={handleRename}
          className="bg-transparent outline-none border-none text-[14px] font-medium"
          style={{ color: 'var(--text-primary)', width: `${Math.max(editValue.length, 8)}ch`, boxShadow: 'none' }}
        />
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 transition-colors duration-150"
          style={{ color: 'var(--text-primary)' }}
        >
          <span className="text-[14px] font-medium truncate max-w-[200px]">
            {title}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            strokeWidth={2}
            style={{ color: 'var(--text-tertiary)' }}
          />
        </button>
      )}

      {open && !editing && (
        <div
          className="absolute left-0 top-full mt-2 z-50 rounded-xl overflow-hidden py-1"
          style={{
            background: 'var(--dropdown-bg)',
            border: '1px solid var(--dropdown-border)',
            boxShadow: 'var(--dropdown-shadow)',
            minWidth: '160px',
          }}
        >
          <button
            onClick={() => { setEditing(true); setEditValue(title); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors duration-150"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--dropdown-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
            Edit Name
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors duration-150"
            style={{ color: 'var(--error)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--dropdown-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function ConversationPageInner({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlMessage = searchParams.get('message');
  const urlFileIds = searchParams.get('fileIds');
  const urlMode = searchParams.get('mode');
  const utils = trpc.useUtils();

  // --- "new" mode: create and redirect ---
  const creatingRef = useRef(false);
  const createConversation = trpc.chat.createConversation.useMutation({
    onSuccess: (data) => {
      const params = new URLSearchParams();
      if (urlMessage) params.set('message', urlMessage);
      if (urlFileIds) params.set('fileIds', urlFileIds);
      if (urlMode) params.set('mode', urlMode);
      const qs = params.toString();
      const target = `/app/chat/${data.id}${qs ? `?${qs}` : ''}`;
      router.replace(target);
    },
    onError: (err) => console.error('Failed to create conversation:', err),
  });

  useEffect(() => {
    if (id === 'new' && !creatingRef.current) {
      creatingRef.current = true;
      createConversation.mutate({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- Normal conversation mode ---
  const [title, setTitle] = useState('New Chat');
  const [autoSendMessage, setAutoSendMessage] = useState<string | null>(urlMessage);

  const { data: conversation, isLoading, error } = trpc.chat.getConversation.useQuery(
    { id },
    { enabled: id !== 'new' }
  );

  const renameConversation = trpc.chat.renameConversation.useMutation({
    onSuccess: (data) => {
      setTitle(data.title ?? 'New Chat');
      utils.chat.getConversation.invalidate({ id });
      utils.chat.listConversations.invalidate();
    },
  });

  const deleteConversation = trpc.chat.deleteConversation.useMutation({
    onSuccess: () => {
      utils.chat.listConversations.invalidate();
      router.push('/app/chat');
    },
  });

  useEffect(() => {
    if (conversation?.title) {
      setTitle(conversation.title);
    }
  }, [conversation?.title]);

  const initialMessages = useMemo(
    () =>
      (conversation?.messages ?? []).map(
        (m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })
      ),
    [conversation?.messages]
  );

  const handleRename = (newTitle: string) => {
    setTitle(newTitle);
    renameConversation.mutate({ id, title: newTitle });
  };

  const handleDelete = () => {
    if (confirm('Delete this conversation? This cannot be undone.')) {
      deleteConversation.mutate({ id });
    }
  };

  // Loading / creating state
  if (id === 'new' || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    );
  }

  // Error / not found
  if (error || !conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center h-full gap-3">
        <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
          Conversation not found.
        </p>
        <button
          onClick={() => router.push('/app/chat')}
          className="text-[13px] font-medium transition-colors duration-150"
          style={{ color: 'var(--accent)' }}
        >
          Back to chats
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Title bar */}
      <div className="flex items-center h-[48px] px-5 flex-shrink-0">
        <TitleDropdown
          title={title}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      </div>

      {/* Chat content */}
      <div className="flex-1 flex flex-col min-h-0 max-w-3xl mx-auto w-full">
        <ConversationView
          conversationId={id}
          title={title}
          initialMessages={initialMessages}
          autoSendMessage={autoSendMessage ?? undefined}
          autoSendFileIds={urlFileIds ? urlFileIds.split(',').filter(Boolean) : undefined}
          autoSendMode={urlMode ? urlMode as ChatMode : undefined}
          onAutoSent={() => {
            setAutoSendMessage(null);
            // Clear URL params to prevent re-send on reload
            router.replace(`/app/chat/${id}`, { scroll: false });
          }}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

export default function ChatConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center h-full">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      }
    >
      <ConversationPageInner id={id} />
    </Suspense>
  );
}
