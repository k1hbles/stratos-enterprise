'use client';

import React, { use, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  VolumeX,
  PlusCircle,
  SquarePen,
  ChevronRight,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Share,
  Download,
  FileSpreadsheet,
  FileText,
  FileIcon,
  Folder,
  ChevronDown,
  Globe,
  ArrowUp,
  ArrowDown,
  X,
  ImageIcon,
  Paperclip,
  Camera,
  BarChart2,
  Target,
  ListTodo,
  Atom,
  Square,
} from 'lucide-react';
import { MobileSidebar, MobileSettingsOverlay, MobileGalleryOverlay } from '@/components/mobile/sidebar';
import { StreamingMessage, toolNameToIcon, toolCallLabel, sanitizeAttr, sanitizeContent, isPipelineTool, parsePhaseMarker } from '@/components/chat/StreamingMessage';

const SpeakIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <path d="M13 8.5a5 5 0 0 1 0 7" />
    <path d="M16.5 5.5a10 10 0 0 1 0 13" />
  </svg>
);

/* ─── Types ──────────────────────────────────────────────── */

interface TaskFile {
  fileName: string;
  downloadUrl: string;
  fileSize: number;
  previewUrl?: string;
}

interface Attachment {
  data: string;       // base64 (no data: prefix)
  mediaType: string;
  type: 'image' | 'file';
  name: string;
  size: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  raw: string;
  file?: TaskFile;
  streaming?: boolean;
  taskDone?: boolean;
  attachments?: Attachment[];
}

/* ─── Helpers ────────────────────────────────────────────── */

function formatFileSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'xlsx' || ext === 'csv') return FileSpreadsheet;
  if (ext === 'pdf' || ext === 'docx' || ext === 'doc') return FileText;
  return FileIcon;
}

/* ─── Sub-components (assets from mockup) ────────────────── */

/** FileCard — file preview card */
function FileCard({ file, onPreview }: { file: TaskFile; onPreview: () => void }) {
  const Icon = getFileIcon(file.fileName);
  return (
    <button
      onClick={onPreview}
      className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-2xl p-3.5 flex items-center gap-3.5 text-left w-full"
    >
      <div className="bg-[var(--bg-elevated)] p-2.5 rounded-xl text-[var(--text-secondary)]">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className="flex flex-col overflow-hidden flex-1">
        <span className="text-[15px] font-medium text-[var(--text-primary)] truncate">{file.fileName}</span>
        <span className="text-[13px] text-[var(--text-placeholder)] mt-0.5">{formatFileSize(file.fileSize)}</span>
      </div>
      <ChevronRight size={18} className="text-[var(--text-placeholder)] flex-shrink-0" />
    </button>
  );
}

/** FilePreviewOverlay — full-screen file preview for mobile */
function FilePreviewOverlay({ file, onClose }: { file: TaskFile; onClose: () => void }) {
  const ext = file.fileName.split('.').pop()?.toLowerCase() ?? '';
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  const hasPreview = !!file.previewUrl;
  const Icon = getFileIcon(file.fileName);

  return (
    <div className="absolute inset-0 bg-[var(--bg-page)] z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-strong)] flex-shrink-0">
        <button onClick={onClose} className="text-[#5c9dff] text-[15px] font-medium">
          Close
        </button>
        <span className="text-[15px] font-medium text-[var(--text-primary)] truncate max-w-[50%]">
          {file.fileName}
        </span>
        <a
          href={file.downloadUrl}
          download={file.fileName}
          className="text-[#5c9dff] hover:text-blue-300"
        >
          <Download size={20} />
        </a>
      </div>

      {/* Preview body */}
      <div className="flex-1 overflow-hidden">
        {isPdf || hasPreview ? (
          <iframe
            src={hasPreview ? file.previewUrl! : file.downloadUrl}
            className="w-full h-full border-0"
            title={file.fileName}
            sandbox={hasPreview ? "allow-same-origin" : undefined}
          />
        ) : isImage ? (
          <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.downloadUrl}
              alt={file.fileName}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        ) : (
          /* Non-previewable file types — show file info + actions */
          <div className="flex flex-col items-center justify-center h-full gap-5 px-6">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] p-6 rounded-2xl">
              <Icon size={48} strokeWidth={1.2} className="text-[var(--text-subtle)]" />
            </div>
            <div className="text-center">
              <p className="text-[16px] font-medium text-[var(--text-primary)]">{file.fileName}</p>
              <p className="text-[13px] text-[var(--text-placeholder)] mt-1">{formatFileSize(file.fileSize)}</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-[260px]">
              <a
                href={file.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[15px] font-medium bg-[#5c9dff] text-white"
              >
                Open File
              </a>
              <a
                href={file.downloadUrl}
                download={file.fileName}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[15px] font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)]"
              >
                <Download size={16} strokeWidth={2} />
                Download
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** FilesOverlay — full-screen file browser */
function FilesOverlay({ files, onClose }: { files: TaskFile[]; onClose: () => void }) {
  const totalSize = files.reduce((a, f) => a + f.fileSize, 0);
  return (
    <div className="absolute inset-0 bg-[var(--content-card-bg)] z-40 flex flex-col animate-slide-up rounded-t-3xl mt-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-[var(--border-strong)]">
      <div className="flex flex-col items-center pt-3 pb-4 px-4 border-b border-[var(--border-default)]">
        <div className="w-12 h-1.5 bg-[var(--bg-elevated)] rounded-full mb-5 cursor-pointer" onClick={onClose} />
        <div className="flex items-center justify-between w-full">
          <div className="w-6" />
          <span className="font-medium text-[16px]">All files({files.length})</span>
          <button className="text-[var(--text-subtle)] hover:text-[var(--text-primary)]"><Download size={22} /></button>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-6 mt-2 overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Folder size={28} className="text-[var(--text-placeholder)] fill-[var(--text-placeholder)]/20" strokeWidth={1.5} />
            <div className="flex flex-col">
              <span className="text-[16px] text-[var(--text-primary)]">output</span>
              <span className="text-[13px] text-[var(--text-placeholder)] mt-0.5">{formatFileSize(totalSize)}</span>
            </div>
          </div>
          <ChevronDown size={22} className="text-[var(--text-placeholder)]" />
        </div>
        {files.map((f) => {
          const Icon = getFileIcon(f.fileName);
          return (
            <div key={f.fileName} className="flex items-center justify-between pl-11">
              <div className="flex items-center gap-4">
                <div className="border border-[var(--text-placeholder)] rounded-lg p-1.5 text-[var(--text-subtle)]">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] text-[var(--text-primary)]">{f.fileName}</span>
                  <span className="text-[13px] text-[var(--text-placeholder)] mt-0.5">{formatFileSize(f.fileSize)}</span>
                </div>
              </div>
              <a href={f.downloadUrl} download={f.fileName} target="_blank" rel="noopener noreferrer" className="text-[var(--text-subtle)] hover:text-[var(--text-primary)]">
                <Download size={20} />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function TypingBubble() {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[var(--text-primary)] text-base leading-relaxed whitespace-pre-wrap flex items-center h-6 mt-2">
        <motion.div
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'easeInOut',
          }}
          className="w-3.5 h-3.5 bg-[var(--text-primary)] rounded-full"
        />
      </div>
    </div>
  );
}

/* ─── Inner component ────────────────────────────────────── */

function MobileConversationInner({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlMessage = searchParams.get('message');
  const urlMode = searchParams.get('mode');
  const urlFileIds = searchParams.get('fileIds');

  const [messages, setMessages] = useState<Message[]>([]);
  const [convTitle, setConvTitle] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [previewFile, setPreviewFile] = useState<TaskFile | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [todos, setTodos] = useState<Array<{ text: string; done: boolean }>>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSentRef = useRef(false);
  const creatingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const userScrolledUpRef = useRef(false);

  const allFiles = messages.reduce<TaskFile[]>((acc, m) => {
    if (m.file) acc.push(m.file);
    return acc;
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    if (scrollRef.current && (!userScrolledUpRef.current || force)) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: force ? 'smooth' : 'auto' });
    }
  }, []);

  // Detect when user manually scrolls away from bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distFromBottom > 80;
      setShowScrollButton(distFromBottom > 100);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  /* Handle "new" id: create then redirect */
  useEffect(() => {
    if (id === 'new' && !creatingRef.current) {
      creatingRef.current = true;
      fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
        .then((r) => r.json())
        .then((data) => {
          const params = new URLSearchParams();
          if (urlMessage) params.set('message', urlMessage);
          if (urlMode) params.set('mode', urlMode);
          if (urlFileIds) params.set('fileIds', urlFileIds);
          const qs = params.toString();
          router.replace(`/m/chat/${data.id}${qs ? `?${qs}` : ''}`);
        })
        .catch((err) => {
          console.error('Failed to create conversation:', err);
          setError(true);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* Fetch existing messages */
  useEffect(() => {
    if (id === 'new') return;
    fetch(`/api/conversations/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        if (data.messages?.length) {
          setMessages(
            data.messages.map((m: { id: string; role: string; content: string; metadata?: string }) => {
              const meta = m.metadata ? (() => { try { return JSON.parse(m.metadata); } catch { return null; } })() : null;
              return {
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content,
                raw: meta?.raw ?? m.content ?? '',
                file: meta?.file ? { fileName: meta.file.name, downloadUrl: meta.file.url, fileSize: meta.file.size ?? 0, ...(meta.file.previewUrl ? { previewUrl: meta.file.previewUrl } : {}) } : undefined,
                attachments: meta?.attachments?.map((a: { mediaType: string; name: string; data: string }) => ({
                  data: a.data,
                  mediaType: a.mediaType,
                  type: a.mediaType?.startsWith('image/') ? 'image' as const : 'file' as const,
                  name: a.name,
                  size: 0,
                })) ?? undefined,
              };
            })
          );
        }
        // Restore todos from conversation
        if (data.todos) {
          try { setTodos(JSON.parse(data.todos)); } catch { /* ignore */ }
        }
        setLoaded(true);
      })
      .catch(() => setError(true));
  }, [id]);

  /* Auto-send from ?message param */
  useEffect(() => {
    if (!loaded || autoSentRef.current || isStreaming) return;
    if (!urlMessage) return;
    autoSentRef.current = true;
    const fileIds = urlFileIds ? urlFileIds.split(',').filter(Boolean) : undefined;
    // Read and clear any pending attachments stored by the homepage before navigation
    let pendingAttachments: Attachment[] | undefined;
    try {
      const raw = sessionStorage.getItem('pendingAttachments');
      if (raw) {
        pendingAttachments = JSON.parse(raw) as Attachment[];
        sessionStorage.removeItem('pendingAttachments');
      }
    } catch { /* ignore parse errors */ }
    handleSend(urlMessage, fileIds, pendingAttachments);
    // Clear URL params to prevent re-send on reload
    router.replace(`/m/chat/${id}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, urlMessage]);

  const handleNewChat = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    router.push('/m/chat');
  };

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleFileClick = (accept?: string) => {
    if (fileInputRef.current) {
      if (accept) {
        fileInputRef.current.accept = accept;
      } else {
        fileInputRef.current.removeAttribute('accept');
      }
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (files: File[]) => {
    try {
      const newAtts = await Promise.all(files.map(async (f) => {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const comma = result.indexOf(',');
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(f);
        });
        return {
          data: base64,
          mediaType: f.type || 'application/octet-stream',
          type: (f.type.startsWith('image/') ? 'image' : 'file') as 'image' | 'file',
          name: f.name,
          size: f.size,
        };
      }));
      setAttachments((prev) => [...prev, ...newAtts]);
    } catch (err) {
      console.error('[handleFileSelect] Failed to read file:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsPlusMenuOpen(false); // close immediately (sync) before async reading
      handleFileSelect(Array.from(files));
    }
    if (e.target) e.target.value = '';
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  /* Send message — all requests go through OpenClaw (/api/chat) */
  const handleSend = async (content?: string, fileIds?: string[], extraAttachments?: Attachment[]) => {
    const text = (content ?? input).trim();
    const currentAttachments = extraAttachments ?? (content ? [] : attachments); // programmatic sends ignore input attachments
    if ((!text && currentAttachments.length === 0 && !fileIds?.length) || isStreaming) return;
    if (!content) {
      setInput('');
      setAttachments([]);
    }
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    userScrolledUpRef.current = false; // snap to bottom for new response

    const assistantId = `temp-assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: 'user', content: text, raw: '', attachments: currentAttachments.length > 0 ? currentAttachments : undefined },
    ]);
    setIsStreaming(true);
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', raw: '', streaming: true },
    ]);

    let rawAccum = '';
    let imageTagBuffer = '';
    let isImageTool = false;
    let pipelineMode = false;
    let pipelinePhaseOpen = false;
    const pushRaw = (r: string) =>
      setMessages((prev) => prev.map((m) => m.id !== assistantId ? m : { ...m, raw: r }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const chatEndpoint = process.env.NEXT_PUBLIC_USE_OPENCLAW === 'true'
        ? '/api/chat/elk-bridge'
        : '/api/chat';
      const res = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: id,
          message: text || (currentAttachments.length > 0 ? 'What do you see in this image?' : ''),
          mode: selectedChip ? (selectedChip === 'Deep Research' ? 'openclaw' : 'auto') : 'auto',
          fileIds: fileIds?.length ? fileIds : undefined,
          attachments: currentAttachments.length > 0
            ? currentAttachments.map((a) => ({ data: a.data, mediaType: a.mediaType, name: a.name }))
            : undefined,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
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
          if (parsed.type === 'error') throw new Error(parsed.message || 'Stream error');

          if (parsed.type === 'text' && parsed.text) {
            // Close open pipeline phase before text narration
            if (pipelineMode && pipelinePhaseOpen) {
              rawAccum += '</tool>';
              pipelinePhaseOpen = false;
            }
            rawAccum += parsed.text;
            pushRaw(rawAccum);
            scrollToBottom();
          } else if (parsed.type === 'tool_call' && parsed.toolName) {
            isImageTool = parsed.toolName === 'generate_image';
            imageTagBuffer = '';
            if (isPipelineTool(parsed.toolName)) {
              pipelineMode = true;
              pipelinePhaseOpen = false;
            } else {
              const iconName = toolNameToIcon(parsed.toolName);
              const label = toolCallLabel(parsed.toolName, parsed.args ?? {});
              rawAccum += `<tool name="${iconName}" label="${sanitizeAttr(label)}">`;
            }
            pushRaw(rawAccum);
            scrollToBottom();
          } else if (parsed.type === 'tool_progress' && parsed.message) {
            // Check for todos metadata
            if (parsed.message.startsWith('{"__type":"todos_update"')) {
              try {
                const meta = JSON.parse(parsed.message);
                if (meta.__type === 'todos_update' && Array.isArray(meta.todos)) {
                  setTodos(meta.todos.map((t: { text: string; done: boolean }) => ({ text: t.text, done: t.done })));
                  continue;
                }
              } catch { /* not JSON, fall through */ }
            }
            if (pipelineMode) {
              const phase = parsePhaseMarker(parsed.message);
              if (phase) {
                if (pipelinePhaseOpen) rawAccum += '</tool>';
                rawAccum += `<tool name="${phase.icon}" label="${sanitizeAttr(phase.label)}">`;
                pipelinePhaseOpen = true;
              } else if (pipelinePhaseOpen) {
                // Strip <item> wrapper if server already added it
                const inner = parsed.message.replace(/^<item>(.*)<\/item>$/, '$1');
                rawAccum += `<item>${sanitizeContent(inner)}</item>\n`;
              }
            } else {
              const isImageTag = /^<\/?image_(generating|result)[\s>]/.test(parsed.message);
              if (isImageTool && isImageTag) {
                imageTagBuffer += `${parsed.message}\n`;
              } else {
                rawAccum += `${isImageTag ? parsed.message : sanitizeContent(parsed.message)}\n`;
              }
            }
            pushRaw(rawAccum + (isImageTool ? imageTagBuffer : ''));
            scrollToBottom();
          } else if (parsed.type === 'tool_result') {
            if (pipelineMode) {
              if (pipelinePhaseOpen) rawAccum += '</tool>';
              pipelinePhaseOpen = false;
              pipelineMode = false;
            } else {
              rawAccum += '</tool>';
            }
            if (imageTagBuffer) {
              rawAccum += imageTagBuffer;
              imageTagBuffer = '';
            }
            isImageTool = false;
            pushRaw(rawAccum);
          } else if (parsed.type === 'file_ready') {
            const f = parsed.file;
            if (f) {
              setMessages((prev) => prev.map((m) => m.id !== assistantId ? m : {
                ...m,
                file: { fileName: f.name, downloadUrl: f.url, fileSize: f.size ?? 0, ...(f.previewUrl ? { previewUrl: f.previewUrl } : {}) },
              }));
            }
          } else if (parsed.type === 'title_update' && parsed.title) {
            setConvTitle(parsed.title);
          } else if (parsed.type === 'done') {
            const f = parsed.file;
            if (f) {
              setMessages((prev) => prev.map((m) => m.id !== assistantId ? m : {
                ...m,
                taskDone: true,
                file: { fileName: f.name, downloadUrl: f.url, fileSize: f.size ?? 0, ...(f.previewUrl ? { previewUrl: f.previewUrl } : {}) },
              }));
            }
          }
        }
        if (streamDone) break;
      }

      setMessages((prev) =>
        prev.map((m) => m.id !== assistantId ? m :
          { ...m, raw: rawAccum, content: rawAccum, streaming: false }
        )
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Mark the partial message as done (not streaming)
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m));
        return;
      }
      console.error('Chat error:', err);
      const errText = 'Sorry, something went wrong. Please try again.';
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId
          ? { ...m, content: errText, raw: errText, streaming: false }
          : m
        )
      );
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  };

  /* Loading states */
  if (id === 'new') {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-placeholder)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center h-full gap-3">
        <p className="text-[14px] text-[var(--text-placeholder)]">Conversation not found.</p>
        <button onClick={() => router.push('/m/chat')} className="text-[13px] font-medium text-[#5c9dff]">
          Back to chats
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 z-10 bg-[var(--bg-page)]">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="3" y1="15" x2="14" y2="15" />
            </svg>
          </button>
          {convTitle ? (
            <span className="text-[16px] font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
              {convTitle}
            </span>
          ) : (
            <span className="flex items-center gap-1 font-semibold text-lg">
              ELK{' '}
              <span className="text-[var(--text-subtle)] font-normal">Agent</span>
              <ChevronRight className="w-4 h-4 text-[var(--text-subtle)]" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[var(--text-secondary)]">
          <button onClick={handleNewChat}><SquarePen size={18} strokeWidth={2.5} /></button>
        </div>
      </div>

      {/* Main Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[14px] text-[var(--text-placeholder)]">Start a conversation...</p>
          </div>
        ) : (
          <div className="px-4 pt-2 flex flex-col gap-6 pb-10">
            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="flex justify-end"
                  >
                    <div className="flex flex-col items-end gap-1.5 max-w-[85%]">
                      {/* Image thumbnails */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {msg.attachments.map((att, i) => att.type === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={`data:${att.mediaType};base64,${att.data}`}
                              alt={att.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          ) : (
                            <div key={i} className="flex items-center gap-1.5 bg-[var(--bg-elevated)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)]">
                              <FileIcon size={13} />
                              <span className="truncate max-w-[100px]">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Text bubble */}
                      {msg.content && (
                        <div className="bg-[var(--user-bubble-bg)] text-[var(--user-bubble-text)] rounded-2xl rounded-tr-sm px-4 py-3 text-[16px] leading-relaxed">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              }

              /* ── Assistant message — interleaved blocks ── */
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="flex flex-col gap-2"
                >
                  {/* Streaming message */}
                  {msg.raw && (
                    <StreamingMessage content={msg.raw} done={!msg.streaming} onSendMessage={(text) => handleSend(text)} />
                  )}

                  {/* File card + All files */}
                  {msg.file && (
                    <div className="flex flex-col gap-2.5 mt-1">
                      <FileCard file={msg.file} onPreview={() => setPreviewFile(msg.file!)} />
                      <button
                        onClick={() => setShowFiles(true)}
                        className="bg-[var(--bg-tertiary)] border border-[var(--bg-elevated)] rounded-2xl p-3.5 flex items-center gap-3.5 text-left w-full"
                      >
                        <div className="bg-[var(--bg-elevated)] p-2.5 rounded-xl text-[var(--text-secondary)]">
                          <Folder size={22} strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[15px] font-medium text-[var(--text-primary)]">All files</span>
                          <span className="text-[13px] text-[var(--text-placeholder)] mt-0.5">Preview and download files</span>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Pulsing dot — visible while streaming (initial load or thinking) */}
                  {msg.streaming && <TypingBubble />}

                  {/* Reaction bar — only after streaming completes */}
                  {msg.raw && !msg.streaming && (
                    <div className="flex items-center gap-6 mt-2 text-[var(--text-subtle)]">
                      <button className="hover:text-[var(--text-primary)]"><VolumeX size={20} /></button>
                      <button className="hover:text-[var(--text-primary)]"><ThumbsUp size={20} /></button>
                      <button className="hover:text-[var(--text-primary)]"><ThumbsDown size={20} /></button>
                      <div className="flex-1" />
                      <button className="hover:text-[var(--text-primary)]"><Share size={20} /></button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => {
            userScrolledUpRef.current = false;
            setShowScrollButton(false);
            scrollToBottom(true);
          }}
          className="absolute bottom-36 right-4 w-9 h-9 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center border border-[var(--border-strong)] shadow-lg z-30 text-[var(--text-secondary)]"
        >
          <ArrowDown size={18} />
        </button>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        multiple
      />
      <input
        type="file"
        ref={cameraInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
      />

      {/* Plus menu — bottom sheet */}
      {isPlusMenuOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-[var(--overlay)]" onClick={() => setIsPlusMenuOpen(false)} />
          <div className="relative z-10 bg-[var(--bg-tertiary)] rounded-t-3xl animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-9 h-1 rounded-full bg-[var(--text-placeholder)]" />
            </div>

            {/* File buttons row */}
            <div className="flex gap-3 px-6 pb-5">
              <button
                className="flex-1 bg-[var(--bg-elevated)] rounded-2xl py-4 flex flex-col items-center gap-2 active:bg-[var(--sidebar-item-active)] transition-colors"
                onClick={handleCameraClick}
              >
                <Camera className="w-6 h-6 text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Camera</span>
              </button>
              <button
                className="flex-1 bg-[var(--bg-elevated)] rounded-2xl py-4 flex flex-col items-center gap-2 active:bg-[var(--sidebar-item-active)] transition-colors"
                onClick={() => handleFileClick('image/*,video/*')}
              >
                <ImageIcon className="w-6 h-6 text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Photos</span>
              </button>
              <button
                className="flex-1 bg-[var(--bg-elevated)] rounded-2xl py-4 flex flex-col items-center gap-2 active:bg-[var(--sidebar-item-active)] transition-colors"
                onClick={() => handleFileClick()}
              >
                <Paperclip className="w-6 h-6 text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Files</span>
              </button>
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-[var(--bg-elevated)]" />

            {/* Capability list */}
            <div className="px-6 py-3 flex flex-col" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
              {[
                { icon: Globe, label: 'Deep Research', desc: 'Get a detailed report' },
                { icon: BarChart2, label: 'Analysis', desc: 'Analyze data and trends' },
                { icon: Target, label: 'Strategy', desc: 'Plan and strategize' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => { setSelectedChip(item.label); setIsPlusMenuOpen(false); }}
                    className="flex items-center gap-4 py-3.5 active:bg-[var(--sidebar-item-hover)] rounded-xl px-1 transition-colors"
                  >
                    <Icon size={22} className="text-[var(--text-subtle)] shrink-0" />
                    <div className="flex flex-col items-start">
                      <span className="text-[15px] font-medium text-[var(--text-primary)]">{item.label}</span>
                      <span className="text-[13px] text-[var(--text-placeholder)]">{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Input Area */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-[var(--bg-page)] pt-2 px-4 flex flex-col gap-2.5 z-20"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}
      >
        {/* Task Progress Bar */}
        {todos.length > 0 && (() => {
          const done = todos.filter((t) => t.done).length;
          const total = todos.length;
          const allDone = done === total;
          return (
            <div className="flex items-center gap-2.5 px-1">
              <ListTodo size={16} strokeWidth={1.5} className="text-[var(--text-subtle)] shrink-0" />
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(done / total) * 100}%`, background: allDone ? '#22c55e' : '#5c9dff' }}
                />
              </div>
              <span className="text-[12px] text-[var(--text-subtle)] shrink-0 tabular-nums">
                {done}/{total}
              </span>
              {allDone && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              )}
            </div>
          );
        })()}

        {/* Input card — always the same shape */}
        <div className="rounded-2xl overflow-hidden border" style={{ background: 'var(--chatbox-bg)', borderColor: 'var(--chatbox-border)' }}>
          {/* Thinking chip */}
          {selectedChip && (
            <div className="px-3 pt-2.5">
              <div className="flex items-center gap-1 px-3 py-1 rounded-full w-max border" style={{ background: 'var(--thinking-pill-bg)', color: 'var(--thinking-pill-text)', borderColor: 'var(--thinking-pill-border)' }}>
                <Atom className="w-4 h-4" />
                <span className="text-sm font-medium">{selectedChip}</span>
                <X
                  className="w-4 h-4 ml-1 cursor-pointer"
                  onClick={() => setSelectedChip(null)}
                />
              </div>
            </div>
          )}

          {/* Attachment thumbnails preview row */}
          {attachments.length > 0 && (
            <div className="flex gap-2 px-3 pt-2.5 overflow-x-auto scrollbar-hide">
              {attachments.map((att, i) => (
                <div key={i} className="relative flex-shrink-0">
                  {att.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`data:${att.mediaType};base64,${att.data}`}
                      alt={att.name}
                      className="w-[72px] h-[72px] object-cover rounded-lg cursor-pointer"
                      onClick={() => setPreviewImage({ src: `data:${att.mediaType};base64,${att.data}`, name: att.name })}
                    />
                  ) : (
                    <div className="w-[72px] h-[72px] flex flex-col items-center justify-center bg-[var(--bg-elevated)] rounded-lg gap-1">
                      <FileIcon size={22} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
                      <span className="text-[9px] text-[var(--text-placeholder)] px-1 text-center truncate w-full leading-tight">{att.name.slice(0, 12)}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--bg-page)] border border-[var(--border-strong)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-center gap-3 px-2 py-1.5">
            <button
              className="p-1.5 text-[var(--text-subtle)] hover:text-[var(--text-primary)]"
              onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
            >
              <PlusCircle size={22} />
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask ELK anything"
              className="flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder-[var(--text-placeholder)] text-[15px] no-focus-ring resize-none leading-relaxed overflow-y-auto"
              style={{ maxHeight: 120 }}
            />
            {isStreaming ? (
              <button
                className="p-1.5 bg-[var(--send-btn-bg)] rounded-full text-[var(--send-btn-icon)] transition-colors"
                onClick={handleStop}
              >
                <Square size={14} fill="currentColor" strokeWidth={0} />
              </button>
            ) : (input.trim() || attachments.length > 0) ? (
              <button
                className="p-1.5 bg-[var(--send-btn-bg)] rounded-full text-[var(--send-btn-icon)] transition-colors"
                onClick={() => handleSend()}
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            ) : (
              <button className="p-1.5 text-[var(--text-subtle)] hover:text-[var(--text-primary)]">
                <SpeakIcon />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* File preview overlay */}
      {previewFile && (
        <FilePreviewOverlay file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {/* Attachment image lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
            onClick={() => setPreviewImage(null)}
          >
            <X size={24} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage.src}
            alt={previewImage.name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Files overlay */}
      {showFiles && allFiles.length > 0 && (
        <FilesOverlay files={allFiles} onClose={() => setShowFiles(false)} />
      )}

      {/* Settings Overlay */}
      {settingsOpen && <MobileSettingsOverlay onClose={() => setSettingsOpen(false)} />}

      {/* Gallery Overlay */}
      {galleryOpen && (
        <MobileGalleryOverlay
          onClose={() => setGalleryOpen(false)}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      )}

      {/* Sidebar — rendered last so it sits on top of gallery */}
      {sidebarOpen && (
        <MobileSidebar
          onClose={() => { setSidebarOpen(false); setGalleryOpen(false); }}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenGallery={() => setGalleryOpen(true)}
        />
      )}
    </>
  );
}

/* ─── Page wrapper with Suspense ─────────────────────────── */

export default function MobileChatConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center h-full">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text-placeholder)]" />
        </div>
      }
    >
      <MobileConversationInner id={id} />
    </Suspense>
  );
}
