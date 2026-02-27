'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, ArrowDown } from 'lucide-react';
import { MessageBubble, type FileAttachment } from './message-bubble';
import { MessageInput, type ChatMode } from './message-input';
import { StepsGroupContainer, FileOutputCard, TaskCompletedCard, ReactionBar, type StepData, type TaskFile } from './SSEActionCard';
import { trpc } from '@/trpc/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: FileAttachment[];
  steps?: StepData[];
  taskComplete?: boolean;
  taskDuration?: string;
  file?: TaskFile;
  streaming?: boolean;
}

interface ConversationViewProps {
  conversationId: string;
  title?: string;
  initialMessages?: Message[];
  autoSendMessage?: string;
  autoSendFileIds?: string[];
  autoSendMode?: ChatMode;
  onAutoSent?: () => void;
  onRename?: (title: string) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

function RightPanel({ file, onClose }: { file: TaskFile; onClose: () => void }) {
  const ext = file.fileName.split('.').pop()?.toLowerCase() ?? '';
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);

  return (
    <div
      className="flex-shrink-0 flex flex-col h-full"
      style={{ width: '50%', borderLeft: '1px solid var(--border-subtle)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="flex-1 text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {file.fileName}
        </span>
        <a
          href={file.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[12px] transition-colors duration-150 flex-shrink-0"
          style={{ color: 'var(--accent-text)' }}
        >
          Open
        </a>
        <a
          href={file.downloadUrl}
          download={file.fileName}
          className="flex items-center gap-1 text-[12px] transition-colors duration-150 flex-shrink-0"
          style={{ color: 'var(--accent-text)' }}
        >
          <Download size={13} strokeWidth={1.5} />
          Download
        </a>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded transition-colors duration-150"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {isPdf ? (
          <iframe
            src={file.downloadUrl}
            className="w-full h-full border-0"
            title={file.fileName}
          />
        ) : isImage ? (
          <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.downloadUrl}
              alt={file.fileName}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
            <p className="text-[13px] text-center" style={{ color: 'var(--text-secondary)' }}>
              Preview not available for this file type.
            </p>
            <div className="flex items-center gap-3">
              <a
                href={file.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150"
                style={{
                  background: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                }}
              >
                Open File
              </a>
              <a
                href={file.downloadUrl}
                download={file.fileName}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150"
                style={{
                  background: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Download size={14} strokeWidth={1.5} />
                Download
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Scroll-to-bottom threshold (px from bottom) ──────────── */
const SCROLL_THRESHOLD = 120;

export function ConversationView({
  conversationId,
  title = 'New Chat',
  initialMessages = [],
  autoSendMessage,
  autoSendFileIds,
  autoSendMode,
  onAutoSent,
  onRename,
  onDelete: _onDelete,
  readOnly = false,
}: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeFile, setActiveFile] = useState<TaskFile | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const autoSentRef = useRef(false);
  const titleUpdatedRef = useRef(false);
  const streamStartRef = useRef<number>(0);

  // Smooth-streaming refs: buffer text tokens and flush character-by-character
  const textBufferRef = useRef('');
  const displayedBufferRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const streamAssistantIdRef = useRef<string | null>(null);

  // Track whether user is near the bottom — only auto-scroll if true
  const isNearBottomRef = useRef(true);

  const utils = trpc.useUtils();

  useEffect(() => {
    if (!initializedRef.current && initialMessages.length > 0) {
      initializedRef.current = true;
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  /* ── Scroll helpers ──────────────────────────────────────── */
  const checkNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
    isNearBottomRef.current = nearBottom;
    setShowScrollBtn(!nearBottom);
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Auto-scroll only when near bottom
  const autoScroll = useCallback(() => {
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [scrollToBottom]);

  // Scroll listener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => checkNearBottom();
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [checkNearBottom]);

  // Auto-scroll on message changes (only if near bottom)
  useEffect(() => {
    autoScroll();
  }, [messages, autoScroll]);

  /* ── Smooth text flush (bleeds text at a natural rate) ── */
  const flushCycle = useCallback(() => {
    const aid = streamAssistantIdRef.current;
    if (!aid) {
      rafRef.current = null;
      return;
    }

    // If buffer is large, take more characters to keep up
    // If buffer is small, take 1-2 chars for smoothness
    const bufferSize = textBufferRef.current.length;
    const charsToTake = bufferSize > 100 ? 10 : bufferSize > 20 ? 4 : 1;
    
    if (bufferSize > 0) {
      const chunk = textBufferRef.current.slice(0, charsToTake);
      textBufferRef.current = textBufferRef.current.slice(charsToTake);
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aid ? { ...m, content: m.content + chunk } : m
        )
      );
    }

    // Schedule next frame if there's still work to do or streaming is active
    if (isStreaming || textBufferRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(flushCycle);
    } else {
      rafRef.current = null;
    }
  }, [isStreaming]);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushCycle);
    }
  }, [flushCycle]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ── Send handler ───────────────────────────────────────── */
  const handleSend = async (content: string, files: File[] = [], preUploadedFileIds: string[] = [], chatMode: ChatMode = 'openclaw') => {
    if (!content && files.length === 0) return;

    // Upload files
    const uploadedFiles: FileAttachment[] = [];
    if (files.length > 0) {
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Upload failed');
          }
          const record = await res.json();
          uploadedFiles.push({
            id: record.id,
            fileName: record.fileName,
            fileSize: record.fileSize,
            storagePath: record.storagePath,
          });
        } catch (e) {
          console.error('Failed to upload file:', e);
        }
      }
    }

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content,
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    streamStartRef.current = Date.now();

    const assistantId = `temp-assistant-${Date.now()}`;
    streamAssistantIdRef.current = assistantId;
    textBufferRef.current = '';
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ]);

    // Ensure we're scrolled to bottom when starting
    isNearBottomRef.current = true;
    setShowScrollBtn(false);
    scrollToBottom();

    try {
      const fileIds = [...uploadedFiles.map((f) => f.id), ...preUploadedFileIds];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId,
          message: content || `[Uploaded files: ${uploadedFiles.map(f => f.fileName).join(', ')}]`,
          fileIds: fileIds.length > 0 ? fileIds : undefined,
          mode: chatMode,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response stream');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);

          if (parsed.type === 'tool_call') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      steps: [
                        ...(m.steps ?? []),
                        { toolId: parsed.toolId, toolName: parsed.toolName, status: 'running' as const, args: parsed.args },
                      ],
                    }
                  : m
              )
            );
          } else if (parsed.type === 'tool_progress') {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantId) return m;
                const steps = (m.steps ?? []).map((s) =>
                  s.toolId === parsed.toolId
                    ? { ...s, summary: parsed.message }
                    : s
                );
                return { ...m, steps };
              })
            );
          } else if (parsed.type === 'tool_result') {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantId) return m;
                const steps = (m.steps ?? []).map((s) =>
                  s.toolId === parsed.toolId
                    ? { ...s, status: 'completed' as const, summary: parsed.summary, expandData: parsed.expandData }
                    : s
                );
                return { ...m, steps };
              })
            );
          } else if (parsed.type === 'file_ready' || (parsed.type === 'done' && parsed.file)) {
            const f = parsed.file ?? { name: parsed.fileName, size: parsed.fileSize, url: parsed.downloadUrl, mimeType: parsed.mimeType };
            const taskFile: TaskFile = {
              fileName: f.name ?? f.fileName,
              downloadUrl: f.url ?? f.downloadUrl,
              fileSize: f.size ?? f.fileSize ?? 0,
            };
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, file: taskFile } : m))
            );
            setActiveFile(taskFile);
          } else if (parsed.type === 'text' && parsed.text !== undefined) {
            // Buffer text and flush at 60fps instead of updating state per-token
            textBufferRef.current += parsed.text;
            scheduleFlush();
          }
        }
      }

      // Flush any remaining buffered text
      if (textBufferRef.current) {
        const remaining = textBufferRef.current;
        textBufferRef.current = '';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + remaining } : m
          )
        );
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // Finalize assistant message
      const secs = ((Date.now() - streamStartRef.current) / 1000).toFixed(1);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                taskComplete: m.steps != null && m.steps.length > 0,
                taskDuration: `${secs}s`,
                streaming: false,
              }
            : m
        )
      );

      // Auto-title from first user message
      if (!titleUpdatedRef.current && title === 'New Chat' && content.trim()) {
        titleUpdatedRef.current = true;
        const autoTitle = content.slice(0, 60) + (content.length > 60 ? '...' : '');
        onRename?.(autoTitle);
        utils.chat.listConversations.invalidate();
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, something went wrong. Please try again.', streaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      streamAssistantIdRef.current = null;
    }
  };

  useEffect(() => {
    if ((autoSendMessage || autoSendFileIds?.length) && !autoSentRef.current && !isStreaming) {
      autoSentRef.current = true;
      handleSend(autoSendMessage ?? '', [], autoSendFileIds ?? [], autoSendMode ?? 'openclaw');
      onAutoSent?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSendMessage, autoSendFileIds]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: messages + input */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <div className="relative flex-1">
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-y-auto px-4 py-4 space-y-4"
            style={{ scrollbarWidth: 'thin' }}
          >
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center h-full">
                <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
                  Start a conversation...
                </p>
              </div>
            ) : (
              messages.map((msg, msgIdx) => {
                if (msg.role === 'assistant') {
                  /* Auto-generate a task summary from the first step */
                  const taskSummary = msg.steps && msg.steps.length > 0
                    ? msg.steps[0].toolName
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                      + (msg.steps[0].summary ? ` — ${msg.steps[0].summary}` : '')
                    : undefined;

                  /* Find the preceding user message for context */
                  const prevUser = messages.slice(0, msgIdx).reverse().find((m) => m.role === 'user');
                  const headerText = prevUser
                    ? prevUser.content.slice(0, 80) + (prevUser.content.length > 80 ? '...' : '')
                    : taskSummary;

                  return (
                    <div key={msg.id} className="space-y-3">
                      {/* Steps group container (Kimi-style bordered box) */}
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="ml-[48px]">
                          <StepsGroupContainer
                            taskSummary={headerText}
                            steps={msg.steps}
                          />
                        </div>
                      )}

                      {/* Assistant text content */}
                      <MessageBubble 
                        role="assistant" 
                        content={msg.content} 
                        isStreaming={msg.streaming}
                      />

                      {/* File output card (Kimi-style compact) — shown after text */}
                      {msg.file && (
                        <div className="ml-[48px]">
                          <FileOutputCard
                            file={msg.file}
                            onClick={() => setActiveFile(msg.file!)}
                          />
                        </div>
                      )}

                      {/* Reaction bar (copy, like, dislike) */}
                      {msg.content && !msg.streaming && (
                        <ReactionBar content={msg.content} />
                      )}

                      {/* Task completed sticky bar */}
                      {msg.taskComplete && (
                        <div className="pt-2">
                          <TaskCompletedCard duration={msg.taskDuration} />
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <MessageBubble
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    files={msg.files}
                    isStreaming={msg.streaming}
                  />
                );
              })
            )}
          </div>

          {/* Scroll-to-bottom button */}
          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 shadow-lg"
              style={{
                background: 'var(--surface-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                backdropFilter: 'blur(12px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-glass-hover, rgba(255,255,255,0.12))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface-secondary)';
              }}
            >
              <ArrowDown size={13} strokeWidth={2} />
              Back to bottom
            </button>
          )}
        </div>

        {!readOnly && (
          <div className="px-4 pb-4 pt-2">
            <MessageInput
              onSend={(message, files, chatMode) => handleSend(message, files, [], chatMode)}
              disabled={isStreaming}
              initialMode={autoSendMode}
            />
          </div>
        )}
      </div>

      {/* Right: file panel */}
      {activeFile && (
        <RightPanel file={activeFile} onClose={() => setActiveFile(null)} />
      )}
    </div>
  );
}
