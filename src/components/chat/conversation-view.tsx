'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, ArrowDown, ChevronDown, ChevronRight, Check, ClipboardList, Info, Share2, SlidersHorizontal, ImageIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageBubble, type FileAttachment } from './message-bubble';
import { MessageInput, type ChatMode } from './message-input';
import { FileOutputCard, ReactionBar, type TaskFile } from './SSEActionCard';
import { Avatar } from '../ui/avatar';
import { StreamingMessage, toolNameToIcon, toolCallLabel, sanitizeAttr, sanitizeContent } from './StreamingMessage';
import { trpc } from '@/trpc/client';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-4 animate-fade-in-up">
      <Avatar name="AI" src="/intelligence-mascot.png" size="sm" className="mt-1 border-none bg-transparent" />
      <div className="flex items-center gap-1 px-3 py-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: 'var(--text-tertiary)',
              animation: `typing-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}


interface TextBlock { type: 'text'; content: string; }
interface PlanBlock { type: 'plan'; label: string; content: string; }
interface ImageGeneratingBlock { type: 'image_generating'; content: string; }
interface ImageResultBlock { type: 'image_result'; content: string; src: string; prompt: string; imageId: string; }

type Block = TextBlock | PlanBlock | ImageGeneratingBlock | ImageResultBlock;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  raw?: string;
  status?: string;
  files?: FileAttachment[];
  blocks?: Block[];
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

/* ── Plan block parsing & rendering (desktop) ──────────── */

const PLAN_TAG_RE = /<tool\s+name="plan"(?:\s+label="([^"]*)")?\s*>([\s\S]*?)<\/tool>/g;
const IMG_GEN_RE = /<image_generating>[\s\S]*?<\/image_generating>/g;
const IMG_GEN_OPEN_RE = /<image_generating>/;
const IMG_RESULT_RE = /<image_result\s+src="([^"]*)"(?:\s+prompt="([^"]*)")?(?:\s+id="([^"]*)")?>[\s\S]*?<\/image_result>/g;

type ParsedSegment = TextBlock | PlanBlock | ImageGeneratingBlock | ImageResultBlock;

function parsePlanFromText(content: string): ParsedSegment[] {
  // Build an array of { index, length, segment } from all tag types, then sort by index
  const hits: { index: number; length: number; segment: ParsedSegment }[] = [];

  PLAN_TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PLAN_TAG_RE.exec(content)) !== null) {
    hits.push({ index: m.index, length: m[0].length, segment: { type: 'plan', label: m[1] || 'Plan', content: m[2] } });
  }

  IMG_GEN_RE.lastIndex = 0;
  while ((m = IMG_GEN_RE.exec(content)) !== null) {
    hits.push({ index: m.index, length: m[0].length, segment: { type: 'image_generating', content: '' } });
  }

  IMG_RESULT_RE.lastIndex = 0;
  while ((m = IMG_RESULT_RE.exec(content)) !== null) {
    hits.push({
      index: m.index,
      length: m[0].length,
      segment: { type: 'image_result', content: '', src: m[1] || '', prompt: m[2] || '', imageId: m[3] || '' },
    });
  }

  // Check for unclosed image_generating (still streaming)
  const unclosedIdx = content.search(IMG_GEN_OPEN_RE);
  if (unclosedIdx !== -1 && !hits.some((h) => h.index === unclosedIdx)) {
    hits.push({ index: unclosedIdx, length: content.length - unclosedIdx, segment: { type: 'image_generating', content: '' } });
  }

  hits.sort((a, b) => a.index - b.index);

  const segments: ParsedSegment[] = [];
  let cursor = 0;

  for (const hit of hits) {
    if (hit.index < cursor) continue;
    if (hit.index > cursor) {
      const text = content.slice(cursor, hit.index);
      if (text) segments.push({ type: 'text', content: text });
    }
    segments.push(hit.segment);
    cursor = hit.index + hit.length;
  }

  if (cursor < content.length) {
    const remaining = content.slice(cursor);
    if (remaining) segments.push({ type: 'text', content: remaining });
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', content });
  }

  return segments;
}

function PlanContentDesktop({ content }: { content: string }) {
  const lines = content.split('\n').filter((l) => l.trim());
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('SECTION:')) {
          return (
            <div key={i} className="flex items-start gap-2" style={{ color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }} className="shrink-0">§</span>
              <span className="font-semibold">{trimmed.slice(8).trim()}</span>
            </div>
          );
        }
        if (trimmed.startsWith('SLIDE:')) {
          return (
            <div key={i} className="flex items-start gap-2" style={{ color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }} className="shrink-0">▸</span>
              <span className="font-semibold">{trimmed.slice(6).trim()}</span>
            </div>
          );
        }
        if (trimmed.startsWith('SHEET:')) {
          return (
            <div key={i} className="flex items-start gap-2" style={{ color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }} className="shrink-0">⊞</span>
              <span className="font-semibold">{trimmed.slice(6).trim()}</span>
            </div>
          );
        }
        if (trimmed.startsWith('ROW:')) {
          return (
            <div key={i} className="flex items-start gap-2 text-[12px] pl-5" style={{ color: 'var(--text-secondary)' }}>
              <span className="shrink-0">–</span>
              <span>{trimmed.slice(4).trim()}</span>
            </div>
          );
        }
        if (trimmed.startsWith('RATIONALE:')) {
          return (
            <div
              key={i}
              className="text-[12px] italic pl-5 ml-1"
              style={{
                color: 'var(--text-tertiary)',
                borderLeft: '2px solid var(--border-subtle)',
                paddingLeft: '8px',
              }}
            >
              {trimmed.slice(10).trim()}
            </div>
          );
        }
        return (
          <div key={i} className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

function PlanCard({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden my-1 ml-[48px]"
      style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-secondary)' }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors duration-100"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <ClipboardList size={14} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} className="shrink-0" />
        <span className="text-[13px] font-medium shrink-0" style={{ color: 'var(--text-primary)' }}>Plan</span>
        <span className="text-[13px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>|</span>
        <span className="text-[13px] flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <ChevronRight
          size={13}
          strokeWidth={1.5}
          style={{
            color: 'var(--text-tertiary)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
          className="shrink-0"
        />
      </button>

      {open && content && (
        <div
          className="text-[13px] leading-relaxed px-3.5 pb-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <PlanContentDesktop content={content} />
        </div>
      )}
    </div>
  );
}

/* ── Image generation shimmer (desktop) ───────────────── */

function ImageGeneratingDesktop() {
  return (
    <div className="ml-[48px]" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
      <style>{`
        @keyframes dt-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes dt-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .dt-shimmer-text {
          background: linear-gradient(90deg, var(--text-tertiary) 0%, var(--text-primary) 40%, var(--text-tertiary) 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: dt-shimmer 2s linear infinite;
        }
      `}</style>
      <span className="dt-shimmer-text" style={{ fontSize: 14, fontWeight: 400 }}>
        Creating image
      </span>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: 'var(--text-tertiary)',
        display: 'inline-block',
        animation: 'dt-pulse 1.5s ease-in-out infinite',
      }} />
    </div>
  );
}

/* ── Image result with save/share (desktop) ───────────── */

function ImageResultDesktop({
  src, prompt, imageId, onEdit,
}: {
  src: string; prompt: string; imageId: string; onEdit?: (text: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [editText, setEditText] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    const a = document.createElement('a');
    a.href = src;
    a.download = `image-${imageId.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [src, imageId]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        const file = new File([blob], 'image.png', { type: 'image/png' });
        await navigator.share({ files: [file], title: 'Generated image' });
      } catch {
        try { await navigator.clipboard.writeText(src); } catch { /* ignore */ }
      }
    } else {
      try { await navigator.clipboard.writeText(src); } catch { /* ignore */ }
    }
  }, [src]);

  const handleEdit = useCallback(() => {
    if (!editText.trim()) return;
    onEdit?.(editText.trim());
    setEditText('');
    setLightbox(false);
  }, [editText, onEdit]);

  // Lock body scroll and handle Escape
  useEffect(() => {
    if (!lightbox) return;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(false); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [lightbox]);

  return (
    <div className="ml-[48px]" style={{ margin: '8px 0 8px 48px', maxWidth: 400 }}>
      <style>{`
        @keyframes dt-img-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      <div
        style={{
          borderRadius: 16, overflow: 'hidden',
          background: 'var(--surface-secondary)',
          position: 'relative', cursor: error ? 'default' : 'pointer',
        }}
        onClick={() => !error && setLightbox(true)}
      >
        {!loaded && !error && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'var(--surface-secondary)',
            animation: 'dt-img-pulse 1.5s ease-in-out infinite',
            borderRadius: 16, minHeight: 200,
          }} />
        )}
        {error && (
          <div style={{
            minHeight: 200, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            color: 'var(--text-tertiary)', borderRadius: 16,
          }}>
            <ImageIcon size={28} strokeWidth={1.5} />
            <span style={{ fontSize: 13 }}>Image unavailable</span>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src} alt={prompt}
          style={{
            width: '100%', display: 'block', borderRadius: 16,
            opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease',
          }}
          onLoad={() => setLoaded(true)}
          onError={() => { console.error('[ImageResultDesktop] Failed to load', src.slice(0, 80)); setError(true); }}
        />
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Top bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', position: 'relative', zIndex: 10,
            }}
          >
            <button
              onClick={() => setLightbox(false)}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={18} color="white" />
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => setShowPrompt((p) => !p)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: showPrompt ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Info size={18} color="white" />
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '8px 18px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.15)', border: 'none',
                  cursor: 'pointer', color: 'white', fontSize: 14, fontWeight: 500,
                }}
              >
                Save
              </button>
              <button
                onClick={handleShare}
                style={{
                  padding: '8px 18px', borderRadius: 20,
                  background: 'white', border: 'none',
                  cursor: 'pointer', color: 'black', fontSize: 14, fontWeight: 500,
                }}
              >
                Share
              </button>
            </div>
          </div>

          {/* Prompt info overlay */}
          {showPrompt && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)',
                maxWidth: 500, width: 'calc(100% - 40px)',
                background: 'rgba(0,0,0,0.85)', borderRadius: 12, padding: '12px 16px',
                backdropFilter: 'blur(12px)', zIndex: 20,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: 0 }}>
                {prompt}
              </p>
            </div>
          )}

          {/* Image */}
          <div
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 40px' }}
            onClick={() => setLightbox(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src} alt={prompt}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 160px)', objectFit: 'contain', borderRadius: 12 }}
            />
          </div>

          {/* Bottom edit bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '14px 20px' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              maxWidth: 600, margin: '0 auto',
              background: 'rgba(255,255,255,0.1)', borderRadius: 24,
              padding: '10px 16px', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              <SlidersHorizontal size={18} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0 }} />
              <input
                ref={editInputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
                }}
                placeholder="Describe edits"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'white', fontSize: 15, caretColor: 'white',
                }}
              />
              {editText.trim() && (
                <button
                  onClick={handleEdit}
                  style={{
                    width: 30, height: 30, borderRadius: '50%', background: 'white',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 14, color: 'black', lineHeight: 1 }}>&#8593;</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Scroll-to-bottom threshold (px from bottom) ──────────── */
const SCROLL_THRESHOLD = 120;

const MODEL_OPTIONS = [
  { id: 'openclaw' as ChatMode, label: 'Agent', description: 'Flagship research model with web search' },
  { id: 'council'  as ChatMode, label: 'Board', description: 'Multi-agent board of directors' },
] as const;

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
  const [isWaiting, setIsWaiting] = useState(false);
  const [activeFile, setActiveFile] = useState<TaskFile | null>(null);
  const [sources, setSources] = useState<{ url: string; title: string; domain: string; page_age: null; fetched: boolean }[]>([]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [mode, setMode] = useState<ChatMode>(autoSendMode ?? 'openclaw');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const autoSentRef = useRef(false);
  const titleUpdatedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

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
      // Rehydrate raw + file from metadata JSON (persisted during streaming)
      const rehydrated = initialMessages.map((m) => {
        const metaStr = (m as unknown as { metadata?: string }).metadata;
        if (!metaStr) return m;
        try {
          const meta = JSON.parse(metaStr);
          const patched: Message = { ...m };
          if (meta.raw) patched.raw = meta.raw;
          if (meta.file) patched.file = { fileName: meta.file.name, downloadUrl: meta.file.url, fileSize: meta.file.size ?? 0 };
          return patched;
        } catch { return m; }
      });
      setMessages(rehydrated);
      // Restore sources from metadata
      const allSources: { url: string; title: string; domain: string; page_age: null; fetched: boolean }[] = [];
      const seen = new Set<string>();
      for (const m of initialMessages) {
        const metaStr = (m as unknown as { metadata?: string }).metadata;
        if (!metaStr) continue;
        try {
          const meta = JSON.parse(metaStr);
          if (Array.isArray(meta.sources)) {
            for (const s of meta.sources) {
              if (!seen.has(s.url)) {
                seen.add(s.url);
                allSources.push(s);
              }
            }
          }
        } catch { /* ignore */ }
      }
      if (allSources.length > 0) setSources(allSources);
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

  // Close model menu on outside click
  useEffect(() => {
    if (!modelMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node))
        setModelMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modelMenuOpen]);

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
        prev.map((m) => {
          if (m.id !== aid) return m;
          const blocks = [...(m.blocks ?? [])];
          const last = blocks[blocks.length - 1];
          if (last?.type === 'text') {
            blocks[blocks.length - 1] = { ...last, content: last.content + chunk };
          } else {
            blocks.push({ type: 'text', content: chunk });
          }
          return { ...m, blocks };
        })
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
  const handleSend = async (content: string, files: File[] = [], preUploadedFileIds: string[] = []) => {
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
    setSources([]);
    setIsStreaming(true);

    const assistantId = `temp-assistant-${Date.now()}`;
    streamAssistantIdRef.current = assistantId;
    textBufferRef.current = '';
    let rawAccum = '';
    let imageTagBuffer = '';
    let isImageTool = false;
    const pushRaw = (r: string) =>
      setMessages((prev) => prev.map((m) => m.id !== assistantId ? m : { ...m, raw: r }));
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', raw: '', blocks: [], streaming: true },
    ]);
    setIsWaiting(true);

    // Ensure we're scrolled to bottom when starting
    isNearBottomRef.current = true;
    setShowScrollBtn(false);
    scrollToBottom();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const fileIds = [...uploadedFiles.map((f) => f.id), ...preUploadedFileIds];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          conversationId,
          message: content || `[Uploaded files: ${uploadedFiles.map(f => f.fileName).join(', ')}]`,
          fileIds: fileIds.length > 0 ? fileIds : undefined,
          mode: mode,
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
      let streamDone = false;

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
          if (data === '[DONE]') { streamDone = true; break; }

          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.type === 'error') throw new Error(parsed.message || 'Stream error');

          if (parsed.type === 'text') {
            setIsWaiting(false);
          }

          if (parsed.type === 'file_ready' || (parsed.type === 'done' && parsed.file)) {
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
            rawAccum += parsed.text;
            pushRaw(rawAccum);
          } else if (parsed.type === 'tool_call' && parsed.toolName) {
            isImageTool = parsed.toolName === 'generate_image';
            imageTagBuffer = '';
            const iconName = toolNameToIcon(parsed.toolName);
            const lbl = toolCallLabel(parsed.toolName, parsed.args ?? {});
            rawAccum += `<tool name="${iconName}" label="${sanitizeAttr(lbl)}">`;
            pushRaw(rawAccum);
          } else if (parsed.type === 'tool_progress' && parsed.message) {
            if (parsed.message.startsWith('{"__type":"todos_update"')) {
              try {
                const meta = JSON.parse(parsed.message);
                if (meta.__type === 'todos_update') continue;
              } catch { /* not JSON, fall through */ }
            }
            const isImageTag = /^<\/?image_(generating|result)[\s>]/.test(parsed.message);
            if (isImageTool && isImageTag) {
              imageTagBuffer += `${parsed.message}\n`;
            } else {
              rawAccum += `${isImageTag ? parsed.message : sanitizeContent(parsed.message)}\n`;
            }
            pushRaw(rawAccum + (isImageTool ? imageTagBuffer : ''));
          } else if (parsed.type === 'tool_result') {
            rawAccum += '</tool>';
            if (imageTagBuffer) {
              rawAccum += imageTagBuffer;
              imageTagBuffer = '';
            }
            isImageTool = false;
            pushRaw(rawAccum);
            if (parsed.expandData && parsed.expandData.type === 'search_results') {
              const newSources: { url: string; title: string; domain: string; page_age: null; fetched: boolean }[] = parsed.expandData.results.map(
                (r: { title: string; url: string }) => {
                  let domain = '';
                  try { domain = new URL(r.url).hostname.replace('www.', ''); } catch { /* ignore */ }
                  return { url: r.url, title: r.title, domain, page_age: null, fetched: false };
                }
              );
              setSources((prev) => {
                const existing = new Set(prev.map((s) => s.url));
                return [...prev, ...newSources.filter((s) => !existing.has(s.url))];
              });
            } else if (parsed.expandData && parsed.expandData.type === 'fetch_result') {
              setSources((prev) => {
                const idx = prev.findIndex((s) => s.url === parsed.expandData.url);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], fetched: true };
                  return updated;
                }
                let domain = '';
                try { domain = new URL(parsed.expandData.url).hostname.replace('www.', ''); } catch { /* ignore */ }
                return [...prev, { url: parsed.expandData.url, title: parsed.expandData.title, domain, page_age: null, fetched: true }];
              });
            }
          }
        }
        if (streamDone) break;
      }

      // Flush any remaining buffered text
      if (textBufferRef.current) {
        const remaining = textBufferRef.current;
        textBufferRef.current = '';
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
            const blocks = [...(m.blocks ?? [])];
            const last = blocks[blocks.length - 1];
            if (last?.type === 'text') {
              blocks[blocks.length - 1] = { ...last, content: last.content + remaining };
            } else {
              blocks.push({ type: 'text', content: remaining });
            }
            return { ...m, blocks };
          })
        );
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // Finalize assistant message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false, raw: rawAccum } : m
        )
      );

      // Auto-title via AI after first exchange
      if (!titleUpdatedRef.current && title === 'New Chat' && content.trim() && conversationId) {
        titleUpdatedRef.current = true;
        fetch(`/api/conversations/${conversationId}/title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userMessage: content }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.title) {
              onRename?.(data.title);
              utils.chat.listConversations.invalidate();
            }
          })
          .catch(() => {/* silently ignore title gen failures */});
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User stopped the stream — finalize without error
        if (textBufferRef.current) {
          const remaining = textBufferRef.current;
          textBufferRef.current = '';
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              const blocks = [...(m.blocks ?? [])];
              const last = blocks[blocks.length - 1];
              if (last?.type === 'text') {
                blocks[blocks.length - 1] = { ...last, content: last.content + remaining };
              } else {
                blocks.push({ type: 'text', content: remaining });
              }
              return { ...m, blocks };
            })
          );
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false, raw: rawAccum } : m
          )
        );
      } else {
        console.error('Chat error:', err);
        const errText = 'Sorry, something went wrong. Please try again.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content || errText,
                  raw: rawAccum || errText,
                  streaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setIsWaiting(false);
      streamAssistantIdRef.current = null;
      abortRef.current = null;
    }
  };

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleRetry = useCallback((msgId: string) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msgId);
      if (idx === -1) return prev;
      // Find preceding user message
      const userMsg = prev.slice(0, idx).reverse().find((m) => m.role === 'user');
      if (!userMsg) return prev;
      // Remove the assistant message being retried
      const next = prev.filter((m) => m.id !== msgId);
      // Re-send after state update
      setTimeout(() => handleSend(userMsg.content, [], []), 0);
      return next;
    });
  }, []);

  useEffect(() => {
    if ((autoSendMessage || autoSendFileIds?.length) && !autoSentRef.current && !isStreaming) {
      autoSentRef.current = true;
      handleSend(autoSendMessage ?? '', [], autoSendFileIds ?? []);
      onAutoSent?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSendMessage, autoSendFileIds]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: messages + input */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Model selector header */}
        <div className="relative flex items-center justify-center px-4 py-2 flex-shrink-0"
             style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            className="flex items-center gap-1 font-semibold text-lg"
            onClick={(e) => {
              e.stopPropagation();
              setModelMenuOpen((p) => !p);
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
          >
            {MODEL_OPTIONS.find((m) => m.id === mode)?.label ?? 'Agent'}
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: '1rem' }}>
              {' '}{MODEL_OPTIONS.find((m) => m.id === mode)?.description.split(' ').slice(0, 2).join(' ')}
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          </button>

          <AnimatePresence>
            {modelMenuOpen && (
              <motion.div
                ref={modelMenuRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-14 left-1/2 -translate-x-1/2 rounded-2xl w-[280px] z-50 overflow-hidden"
                style={{ background: '#2C2C2E', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)', border: '1px solid #3C3C3E' }}
              >
                {/* Header */}
                <div className="p-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF', borderBottom: '1px solid #3C3C3E' }}>
                  ELK
                </div>

                {/* Options */}
                <div className="flex flex-col">
                  {MODEL_OPTIONS.map((opt, idx) => (
                    <div key={opt.id}>
                      <button
                        onClick={() => { setMode(opt.id); setModelMenuOpen(false); }}
                        className="flex items-center justify-between w-full p-4 text-left transition-colors duration-100 hover:bg-[#3C3C3E]"
                        style={{ background: 'transparent', color: '#fff' }}
                      >
                        <div>
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-sm" style={{ color: '#9CA3AF' }}>{opt.description}</div>
                        </div>
                        {mode === opt.id && <Check className="w-5 h-5" strokeWidth={2.5} />}
                      </button>
                      {idx < MODEL_OPTIONS.length - 1 && (
                        <div className="ml-4" style={{ height: '1px', background: '#3C3C3E' }} />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
              messages.map((msg) => {
                if (msg.role === 'assistant') {
                  /* ── New path: StreamingMessage for messages with raw ── */
                  if (msg.raw) {
                    return (
                      <div key={msg.id} className="space-y-1">
                        <div className="flex items-start gap-3">
                          <Avatar name="AI" src="/intelligence-mascot.png" size="sm" className="mt-1 border-none bg-transparent shrink-0" />
                          <div className="flex-1 min-w-0">
                            <StreamingMessage content={msg.raw} done={!msg.streaming} onSendMessage={(text) => handleSend(text)} />
                          </div>
                        </div>

                        {/* File pill */}
                        {msg.file && (
                          <div className="ml-[48px]">
                            <FileOutputCard
                              file={msg.file}
                              onClick={() => setActiveFile(msg.file!)}
                            />
                          </div>
                        )}

                        {/* Reaction bar */}
                        {!msg.streaming && msg.status !== 'interrupted' && msg.status !== 'streaming' && (
                          <ReactionBar content={msg.raw} onRetry={() => handleRetry(msg.id)} />
                        )}

                        {/* Interrupted indicator */}
                        {(msg.status === 'interrupted' || msg.status === 'streaming') && !msg.streaming && (
                          <div className="ml-[48px] flex items-center gap-2 mt-1">
                            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                              Response interrupted
                            </span>
                            <button
                              onClick={() => handleRetry(msg.id)}
                              className="text-[12px] font-medium transition-colors duration-150"
                              style={{
                                color: 'rgb(99,102,241)',
                                border: '1px solid rgba(99,102,241,0.35)',
                                borderRadius: '6px',
                                padding: '1px 8px',
                                background: 'transparent',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              Regenerate ↺
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  /* ── Legacy path: block-based rendering for historical DB messages ── */
                  const blockList = msg.blocks?.length
                    ? msg.blocks
                    : [{ type: 'text' as const, content: msg.content }];
                  return (
                    <div key={msg.id} className="space-y-1">
                      {blockList.flatMap((block, i, arr) => {
                        const isLastBlock = i === arr.length - 1;
                        if (block.type === 'plan') {
                          return (
                            <PlanCard
                              key={`plan-${i}`}
                              label={(block as PlanBlock).label}
                              content={block.content}
                            />
                          );
                        }
                        // Parse text blocks for inline plan tags
                        const segments = parsePlanFromText(block.content);
                        if (segments.length === 1 && segments[0].type === 'text') {
                          return (
                            <MessageBubble
                              key={i}
                              role="assistant"
                              content={block.content}
                              isStreaming={msg.streaming && isLastBlock}
                              hideAvatar={i > 0}
                            />
                          );
                        }
                        return segments.map((seg, j) => {
                          if (seg.type === 'plan') {
                            return (
                              <PlanCard
                                key={`${i}-plan-${j}`}
                                label={(seg as PlanBlock).label}
                                content={seg.content}
                              />
                            );
                          }
                          if (seg.type === 'image_generating') {
                            return <ImageGeneratingDesktop key={`${i}-imggen-${j}`} />;
                          }
                          if (seg.type === 'image_result') {
                            const ir = seg as ImageResultBlock;
                            return (
                              <ImageResultDesktop
                                key={`${i}-imgres-${j}`}
                                src={ir.src}
                                prompt={ir.prompt}
                                imageId={ir.imageId}
                                onEdit={(text) => handleSend(text)}
                              />
                            );
                          }
                          return (
                            <MessageBubble
                              key={`${i}-text-${j}`}
                              role="assistant"
                              content={seg.content}
                              isStreaming={msg.streaming && isLastBlock && j === segments.length - 1}
                              hideAvatar={i > 0 || j > 0}
                            />
                          );
                        });
                      })}

                      {/* File pill — compact, below blocks */}
                      {msg.file && (
                        <div className="ml-[48px]">
                          <FileOutputCard
                            file={msg.file}
                            onClick={() => setActiveFile(msg.file!)}
                          />
                        </div>
                      )}

                      {/* Reaction bar */}
                      {!msg.streaming && msg.status !== 'interrupted' && msg.status !== 'streaming' && (
                        (() => {
                          const fullText = (msg.blocks ?? []).map((b) => b.content).join('') || msg.content;
                          return fullText
                            ? <ReactionBar content={fullText} onRetry={() => handleRetry(msg.id)} />
                            : null;
                        })()
                      )}

                      {/* Interrupted indicator */}
                      {(msg.status === 'interrupted' || msg.status === 'streaming') && !msg.streaming && (
                        <div className="ml-[48px] flex items-center gap-2 mt-1">
                          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                            Response interrupted
                          </span>
                          <button
                            onClick={() => handleRetry(msg.id)}
                            className="text-[12px] font-medium transition-colors duration-150"
                            style={{
                              color: 'rgb(99,102,241)',
                              border: '1px solid rgba(99,102,241,0.35)',
                              borderRadius: '6px',
                              padding: '1px 8px',
                              background: 'transparent',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            Regenerate ↺
                          </button>
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
            {isWaiting && <TypingIndicator />}
          </div>

          {/* Scroll-to-bottom FAB */}
          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center rounded-full transition-all duration-200"
              style={{
                width: '36px',
                height: '36px',
                background: 'var(--surface-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                backdropFilter: 'blur(12px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-glass-hover, rgba(255,255,255,0.12))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface-secondary)';
              }}
            >
              <ChevronDown size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        {!readOnly && (
          <div className="px-4 pb-4 pt-2">
            <MessageInput
              onSend={(message, files) => handleSend(message, files, [])}
              disabled={isStreaming}
              isStreaming={isStreaming}
              onStop={handleStop}
            />
          </div>
        )}
      </div>

      {/* Right: file panel */}
      {activeFile ? (
        <RightPanel file={activeFile} onClose={() => setActiveFile(null)} />
      ) : null}
    </div>
  );
}
