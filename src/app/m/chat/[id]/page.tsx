'use client';

import React, { use, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Menu,
  VolumeX,
  PlusCircle,
  ChevronRight,
  Loader2,
  Maximize2,
  ThumbsUp,
  ThumbsDown,
  Share,
  Info,
  Download,
  FileSpreadsheet,
  FileText,
  FileIcon,
  Folder,
  ChevronDown,
  Lightbulb,
  Terminal,
  Globe,
  Copy,
  ArrowDown,
  Check,
  Bot,
  X,
} from 'lucide-react';
import { MobileSidebar } from '@/components/mobile/sidebar';

const SpeakIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <path d="M13 8.5a5 5 0 0 1 0 7" />
    <path d="M16.5 5.5a10 10 0 0 1 0 13" />
  </svg>
);

/* ─── Types ──────────────────────────────────────────────── */

interface StepData {
  toolId: string;
  toolName: string;
  status: 'running' | 'completed';
  summary?: string;
  args?: Record<string, unknown>;
}

interface TaskFile {
  fileName: string;
  downloadUrl: string;
  fileSize: number;
}

type AssistantBlock =
  | { type: 'text'; text: string }
  | { type: 'steps'; steps: StepData[] };

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  blocks: AssistantBlock[];
  taskComplete?: boolean;
  taskDuration?: string;
  file?: TaskFile;
  streaming?: boolean;
}

/* ─── Helpers ────────────────────────────────────────────── */

function getStepIcon(toolName: string) {
  const lower = toolName.toLowerCase();
  if (lower.includes('read') || lower.includes('document') || lower.includes('presentation'))
    return FileText;
  if (lower.includes('search') || lower.includes('fetch'))
    return Globe;
  return Terminal;
}

function formatToolLabel(toolName: string): string {
  return toolName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

/** StepItem — individual step row, expandable with dropdown */
function StepItem({
  step,
  isLast,
}: {
  step: StepData;
  isLast?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getStepIcon(step.toolName);
  const isRunning = step.status === 'running' && !!isLast;

  // Build a detail subtitle from args (e.g. query, filename)
  const argHint = step.args
    ? String(step.args.query ?? step.args.title ?? step.args.url ?? step.args.prompt ?? '').slice(0, 30)
    : '';
  const subtitle = step.summary || argHint;
  const hasDetail = !!subtitle;

  return (
    <div style={{ borderBottom: isLast ? 'none' : '0.5px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => hasDetail && setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 text-left px-3 py-2.5"
        style={{ cursor: hasDetail ? 'pointer' : 'default' }}
      >
        <div className="w-5 flex justify-center flex-shrink-0">
          {isRunning ? (
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin text-gray-500" />
          ) : (
            <Icon size={14} strokeWidth={1.5} className="text-gray-500" />
          )}
        </div>
        <span className="flex-1 text-[15px] text-gray-300 truncate min-w-0">
          {formatToolLabel(step.toolName)}
        </span>
        {subtitle && !expanded && (
          <span className="text-[13px] text-gray-600 truncate max-w-[100px] flex-shrink-0">
            {subtitle.length > 25 ? subtitle.slice(0, 25) + '...' : subtitle}
          </span>
        )}
        {hasDetail && (
          <ChevronDown
            size={16}
            strokeWidth={1.5}
            className="text-gray-600 flex-shrink-0 transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        )}
      </button>
      {expanded && subtitle && (
        <div className="px-10 pb-3 text-[14px] leading-relaxed text-gray-400">
          {subtitle}
        </div>
      )}
    </div>
  );
}

/** ThinkBlock — expandable "Think" card matching Kimi's design */
function ThinkBlock({ step }: { step: StepData }) {
  const [expanded, setExpanded] = useState(false);
  const reasoning = String(step.args?.reasoning ?? '');
  const isRunning = step.status === 'running';

  // Extract first line as title, rest as body
  const lines = reasoning.split('\n').filter(Boolean);
  const title = lines[0] ?? 'Thinking...';
  const body = lines.slice(1).join('\n').trim();

  return (
    <div className="bg-[#18181a] border border-[#27272a] rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 text-left px-3.5 py-3"
      >
        <div className="w-5 flex justify-center flex-shrink-0">
          {isRunning ? (
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-gray-500" />
          ) : (
            <Lightbulb size={16} strokeWidth={1.5} className="text-gray-400" />
          )}
        </div>
        <span className="flex-1 text-[15px] text-gray-300 font-medium">Think</span>
        <ChevronDown
          size={18}
          strokeWidth={1.5}
          className="text-gray-600 flex-shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {expanded && reasoning && (
        <div className="px-3.5 pb-3.5 border-t border-[#27272a]">
          <p className="text-[15px] font-medium text-gray-200 mt-3 mb-2">{title}</p>
          {body && (
            <p className="text-[15px] leading-relaxed text-gray-400">{body}</p>
          )}
        </div>
      )}
    </div>
  );
}

/** TableRow — table row matching the mockup */
function TableRow({
  col1,
  col2,
  isHeader,
}: {
  col1: string;
  col2: string;
  isHeader?: boolean;
}) {
  return (
    <div className={`flex border-b border-[#27272a] last:border-0 ${isHeader ? 'bg-[#18181a]' : 'bg-[#121212]'}`}>
      <div className="w-1/3 p-3.5 text-[15px] text-gray-300 border-r border-[#27272a]">{col1}</div>
      <div className="w-2/3 p-3.5 text-[15px] text-gray-300">{col2}</div>
    </div>
  );
}

/** FileCard — file preview card */
function FileCard({ file, onPreview }: { file: TaskFile; onPreview: () => void }) {
  const Icon = getFileIcon(file.fileName);
  return (
    <button
      onClick={onPreview}
      className="bg-[#18181a] border border-[#27272a] rounded-2xl p-3.5 flex items-center gap-3.5 text-left w-full"
    >
      <div className="bg-[#27272a] p-2.5 rounded-xl text-gray-300">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className="flex flex-col overflow-hidden flex-1">
        <span className="text-[15px] font-medium text-gray-200 truncate">{file.fileName}</span>
        <span className="text-[13px] text-gray-500 mt-0.5">{formatFileSize(file.fileSize)}</span>
      </div>
      <ChevronRight size={18} className="text-gray-500 flex-shrink-0" />
    </button>
  );
}

/** FilePreviewOverlay — full-screen file preview for mobile */
function FilePreviewOverlay({ file, onClose }: { file: TaskFile; onClose: () => void }) {
  const ext = file.fileName.split('.').pop()?.toLowerCase() ?? '';
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  const Icon = getFileIcon(file.fileName);

  return (
    <div className="absolute inset-0 bg-[#0f0f0f] z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a] flex-shrink-0">
        <button onClick={onClose} className="text-[#5c9dff] text-[15px] font-medium">
          Close
        </button>
        <span className="text-[15px] font-medium text-gray-200 truncate max-w-[50%]">
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
        {isPdf ? (
          <iframe
            src={file.downloadUrl}
            className="w-full h-full border-0"
            title={file.fileName}
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
            <div className="bg-[#1a1a1e] border border-[#27272a] p-6 rounded-2xl">
              <Icon size={48} strokeWidth={1.2} className="text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-[16px] font-medium text-gray-200">{file.fileName}</p>
              <p className="text-[13px] text-gray-500 mt-1">{formatFileSize(file.fileSize)}</p>
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
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[15px] font-medium bg-[#27272a] text-gray-200"
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
    <div className="absolute inset-0 bg-[#121212] z-40 flex flex-col animate-slide-up rounded-t-3xl mt-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-[#27272a]">
      <div className="flex flex-col items-center pt-3 pb-4 px-4 border-b border-[#1c1c1e]">
        <div className="w-12 h-1.5 bg-[#2c2c2e] rounded-full mb-5 cursor-pointer" onClick={onClose} />
        <div className="flex items-center justify-between w-full">
          <div className="w-6" />
          <span className="font-medium text-[16px]">All files({files.length})</span>
          <button className="text-gray-400 hover:text-white"><Download size={22} /></button>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-6 mt-2 overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Folder size={28} className="text-gray-500 fill-gray-500/20" strokeWidth={1.5} />
            <div className="flex flex-col">
              <span className="text-[16px] text-gray-200">output</span>
              <span className="text-[13px] text-gray-500 mt-0.5">{formatFileSize(totalSize)}</span>
            </div>
          </div>
          <ChevronDown size={22} className="text-gray-500" />
        </div>
        {files.map((f) => {
          const Icon = getFileIcon(f.fileName);
          return (
            <div key={f.fileName} className="flex items-center justify-between pl-11">
              <div className="flex items-center gap-4">
                <div className="border border-gray-600 rounded-lg p-1.5 text-gray-400">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] text-gray-200">{f.fileName}</span>
                  <span className="text-[13px] text-gray-500 mt-0.5">{formatFileSize(f.fileSize)}</span>
                </div>
              </div>
              <a href={f.downloadUrl} download={f.fileName} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Download size={20} />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** AssistantContent — renders text with styled bullets, headers, and tables */
function AssistantContent({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let tableRows: string[][] = [];
  let key = 0;

  const flushList = () => {
    if (currentList.length === 0) return;
    elements.push(
      <ul key={key++} className="flex flex-col gap-4 pl-1">
        {currentList.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-[#5c9dff] mt-2 text-[8px]">●</span>
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    currentList = [];
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const [header, ...body] = tableRows;
    elements.push(
      <div key={key++} className="border border-[#27272a] rounded-2xl overflow-hidden bg-[#18181a] mt-2 relative">
        <div className="flex items-center justify-between p-3.5 border-b border-[#27272a] bg-[#18181a]">
          <span className="font-medium text-[15px] text-gray-200">Table</span>
          <div className="flex items-center gap-4 text-gray-400">
            <Copy size={18} />
            <Download size={18} />
          </div>
        </div>
        <div className="flex flex-col">
          {header && <TableRow col1={header[0] ?? ''} col2={header.slice(1).join(' | ')} isHeader />}
          {body.map((row, i) => (
            <TableRow key={i} col1={row[0] ?? ''} col2={row.slice(1).join(' | ')} />
          ))}
        </div>
      </div>
    );
    tableRows = [];
  };

  const renderInline = (s: string): React.ReactNode => {
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    if (parts.length === 1) return s;
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} className="font-medium">{part.slice(2, -2)}</span>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      flushTable();
      continue;
    }

    // Table row: | col1 | col2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Skip separator rows like |---|---|
      if (/^\|[\s-:|]+\|$/.test(trimmed)) continue;
      flushList();
      const cells = trimmed.split('|').filter(Boolean).map((c) => c.trim());
      tableRows.push(cells);
      continue;
    }

    // If we were in a table, flush it
    flushTable();

    // Bullet item
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
      continue;
    }

    // Not a list — flush
    flushList();

    // Heading
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      elements.push(<div key={key++} className="font-medium mt-2">{renderInline(headingMatch[1])}</div>);
      continue;
    }

    // Bold line or header-like line ending with colon
    const isBoldLine = trimmed.startsWith('**') && trimmed.endsWith('**');
    const isColonHeader = trimmed.endsWith(':') && trimmed.length < 80;

    if (isBoldLine) {
      elements.push(<div key={key++} className="font-medium">{trimmed.slice(2, -2)}</div>);
    } else if (isColonHeader) {
      elements.push(<div key={key++} className="font-medium mt-2">{renderInline(trimmed)}</div>);
    } else {
      elements.push(<p key={key++}>{renderInline(trimmed)}</p>);
    }
  }

  flushList();
  flushTable();

  return (
    <div className="text-[16px] text-gray-200 leading-relaxed flex flex-col gap-4">
      {elements}
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-1 items-center h-5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: 5,
            height: 5,
            background: 'rgba(255,255,255,0.4)',
            animation: `mobileBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes mobileBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </span>
  );
}

/* ─── Steps group renderer ───────────────────────────────── */

function StepsGroup({ steps }: { steps: StepData[] }) {
  // Separate think steps from regular tool steps
  const thinkSteps = steps.filter((s) => s.toolName === 'think');
  const toolSteps = steps.filter((s) => s.toolName !== 'think');

  return (
    <div className="flex flex-col gap-3">
      {/* Think blocks — rendered as their own expandable cards */}
      {thinkSteps.map((step) => (
        <ThinkBlock key={step.toolId} step={step} />
      ))}

      {/* Regular tool steps — grouped in a bordered container */}
      {toolSteps.length > 0 && (
        <div className="bg-[#18181a] border border-[#27272a] rounded-2xl overflow-hidden">
          {toolSteps.map((step, i) => (
            <StepItem
              key={step.toolId}
              step={step}
              isLast={i === toolSteps.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Inner component ────────────────────────────────────── */

function MobileConversationInner({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlMessage = searchParams.get('message');
  const urlMode = searchParams.get('mode');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [previewFile, setPreviewFile] = useState<TaskFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);
  const creatingRef = useRef(false);
  const streamStartRef = useRef(0);

  const allFiles = messages.reduce<TaskFile[]>((acc, m) => {
    if (m.file) acc.push(m.file);
    return acc;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
            data.messages.map((m: { id: string; role: string; content: string }) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              blocks: m.content ? [{ type: 'text' as const, text: m.content }] : [],
            }))
          );
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
    handleSend(urlMessage);
    // Clear URL params to prevent re-send on reload
    router.replace(`/m/chat/${id}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, urlMessage]);

  const handleNewChat = () => {
    router.push('/m/chat');
  };

  /* Send message + SSE stream with block-based rendering */
  const handleSend = async (content?: string) => {
    const text = (content ?? input).trim();
    if (!text || isStreaming) return;
    if (!content) setInput('');

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      blocks: [],
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    streamStartRef.current = Date.now();

    const assistantId = `temp-assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', blocks: [], streaming: true },
    ]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: id,
          message: text,
          mode: urlMode ?? 'openclaw',
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Request failed: ${res.status}`);
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
              prev.map((m) => {
                if (m.id !== assistantId) return m;
                const blocks = [...m.blocks];
                const last = blocks[blocks.length - 1];
                const step: StepData = {
                  toolId: parsed.toolId,
                  toolName: parsed.toolName,
                  status: 'running',
                  args: parsed.args,
                };
                if (last?.type === 'steps') {
                  blocks[blocks.length - 1] = { ...last, steps: [...last.steps, step] };
                } else {
                  blocks.push({ type: 'steps', steps: [step] });
                }
                return { ...m, blocks };
              })
            );
          } else if (parsed.type === 'tool_result') {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantId) return m;
                const blocks = m.blocks.map((block) => {
                  if (block.type !== 'steps') return block;
                  return {
                    ...block,
                    steps: block.steps.map((s) =>
                      s.toolId === parsed.toolId
                        ? { ...s, status: 'completed' as const, summary: parsed.summary }
                        : s
                    ),
                  };
                });
                return { ...m, blocks };
              })
            );
          } else if (parsed.type === 'file_ready' || (parsed.type === 'done' && parsed.file)) {
            const f = parsed.file ?? {
              name: parsed.fileName,
              size: parsed.fileSize,
              url: parsed.downloadUrl,
            };
            const taskFile: TaskFile = {
              fileName: f.name ?? f.fileName,
              downloadUrl: f.url ?? f.downloadUrl,
              fileSize: f.size ?? f.fileSize ?? 0,
            };
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, file: taskFile } : m))
            );
          } else if (parsed.text) {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantId) return m;
                const blocks = [...m.blocks];
                const last = blocks[blocks.length - 1];
                if (last?.type === 'text') {
                  blocks[blocks.length - 1] = { ...last, text: last.text + parsed.text };
                } else {
                  blocks.push({ type: 'text', text: parsed.text });
                }
                return { ...m, blocks, content: m.content + parsed.text };
              })
            );
          }
        }
      }

      /* Finalize */
      const secs = ((Date.now() - streamStartRef.current) / 1000).toFixed(1);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          const hasSteps = m.blocks.some((b) => b.type === 'steps');
          return {
            ...m,
            taskComplete: hasSteps,
            taskDuration: `${secs}s`,
            streaming: false,
          };
        })
      );
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: 'Sorry, something went wrong. Please try again.',
                blocks: [{ type: 'text' as const, text: 'Sorry, something went wrong. Please try again.' }],
                streaming: false,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  /* Loading states */
  if (id === 'new') {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center h-full gap-3">
        <p className="text-[14px] text-gray-500">Conversation not found.</p>
        <button onClick={() => router.push('/m/chat')} className="text-[13px] font-medium text-[#5c9dff]">
          Back to chats
        </button>
      </div>
    );
  }

  /* Check if any assistant message has task complete — for sticky banner */
  const hasTaskComplete = messages.some((m) => m.taskComplete);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 z-10 bg-[#0f0f0f]">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">Stratos</span>
            <span className="text-sm text-gray-500 flex items-center gap-1 cursor-pointer hover:text-gray-300">
              Agent <ChevronRight size={14} />
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-300">
          <button onClick={handleNewChat}><PlusCircle size={22} /></button>
        </div>
      </div>

      {/* Main Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[14px] text-gray-500">Start a conversation...</p>
          </div>
        ) : (
          <div className="px-4 pt-2 flex flex-col gap-6 pb-10">
            {/* Sticky Task Completed Banner */}
            {hasTaskComplete && (
              <div className="sticky top-0 z-10 bg-[#0f0f0f] pb-2 pt-2">
                <div className="bg-[#122217] border border-[#1e3a26] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[#4ade80]">
                    <div className="relative flex items-center justify-center w-4 h-4">
                      <div className="absolute inset-0 bg-[#4ade80] rounded-full opacity-20 scale-150" />
                      <div className="w-2.5 h-2.5 bg-[#4ade80] rounded-full" />
                    </div>
                    <span className="font-medium text-[15px]">Task completed</span>
                  </div>
                  <Maximize2 size={18} className="text-gray-400" />
                </div>
              </div>
            )}

            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-[#27272a] text-gray-200 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] text-[16px] leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              /* ── Assistant message — chronological: steps → file → text ── */
              {
                const stepBlocks = msg.blocks.filter((b) => b.type === 'steps');
                const textBlocks = msg.blocks.filter((b) => b.type === 'text');

                return (
                  <React.Fragment key={msg.id}>
                    {/* 1. Steps group (tool calls) */}
                    {stepBlocks.map((block, bi) =>
                      block.type === 'steps' ? <StepsGroup key={`s-${bi}`} steps={block.steps} /> : null
                    )}

                    {/* 2. File card (right after the tool that produced it) */}
                    {msg.file && (
                      <div className="flex flex-col gap-3 mt-1">
                        <FileCard file={msg.file} onPreview={() => setPreviewFile(msg.file!)} />
                        {allFiles.length > 1 && (
                          <button
                            onClick={() => setShowFiles(true)}
                            className="bg-[#18181a] border border-[#27272a] rounded-2xl p-3.5 flex items-center gap-3.5 text-left"
                          >
                            <div className="bg-[#27272a] p-2.5 rounded-xl text-gray-300">
                              <Folder size={24} strokeWidth={1.5} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[15px] font-medium text-gray-200">All files</span>
                              <span className="text-[13px] text-gray-500 mt-0.5">Preview and download files</span>
                            </div>
                          </button>
                        )}
                      </div>
                    )}

                    {/* 3. AI text commentary */}
                    {textBlocks.map((block, bi) =>
                      block.type === 'text' ? <AssistantContent key={`t-${bi}`} text={block.text} /> : null
                    )}

                    {/* Streaming dots */}
                    {msg.streaming && msg.blocks.length === 0 && <StreamingDots />}

                    {/* Action Buttons */}
                    {msg.content && !msg.streaming && (
                      <div className="flex items-center gap-6 mt-2 text-gray-400">
                        <button className="hover:text-white"><VolumeX size={20} /></button>
                        <button className="hover:text-white"><ThumbsUp size={20} /></button>
                        <button className="hover:text-white"><ThumbsDown size={20} /></button>
                        <div className="flex-1" />
                        <button className="hover:text-white"><Share size={20} /></button>
                      </div>
                    )}
                  </React.Fragment>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv,.xlsx,.xls,.pdf,.txt,.md,.docx,.pptx,.json,.png,.jpg,.jpeg"
        onChange={(e) => {
          const selected = Array.from(e.target.files ?? []);
          if (selected.length > 0) setAttachedFiles((prev) => [...prev, ...selected]);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Bottom Input Area */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-[#0f0f0f] pt-2 px-4 flex flex-col gap-2.5 z-20"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}
      >
        {hasTaskComplete ? (
          /* Kimi-style input card — shown after task completes */
          <div className="bg-[#18181a] border border-[#27272a] rounded-2xl overflow-hidden">
            {/* Mode header bar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#27272a]">
              <div className="flex items-center gap-2.5 text-gray-400">
                <Bot size={18} strokeWidth={1.5} />
                <span className="text-[15px] font-medium text-gray-200">Agent</span>
              </div>
              <button
                onClick={handleNewChat}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* File chips */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3.5 pt-2.5">
                {attachedFiles.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1.5 bg-[#27272a] rounded-full px-2.5 py-1 text-[12px] text-gray-300"
                  >
                    {f.name.length > 18 ? f.name.slice(0, 15) + '...' : f.name}
                    <button
                      onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-gray-500 hover:text-white"
                    >
                      <X size={10} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input row */}
            <div className="flex items-center gap-3 px-2 py-1.5">
              <button className="p-1.5 text-gray-400 hover:text-white">
                <SpeakIcon />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Enter your task..."
                className="flex-1 bg-transparent text-white outline-none placeholder-gray-500 text-[15px]"
                disabled={isStreaming}
              />
              <button
                className="p-1.5 text-gray-400 hover:text-white"
                onClick={() => fileInputRef.current?.click()}
              >
                <PlusCircle size={22} />
              </button>
            </div>
          </div>
        ) : (
          /* Simple input — shown before task completes */
          <div className="flex items-center gap-3 bg-[#18181a] rounded-xl px-2 py-1.5 border border-[#27272a]">
            <div className="w-2" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Enter your request..."
              className="flex-1 bg-transparent text-white outline-none placeholder-gray-500 text-[15px]"
              disabled={isStreaming}
            />
            <button
              className="p-1.5 text-gray-400 hover:text-white"
              onClick={() => fileInputRef.current?.click()}
            >
              <PlusCircle size={22} />
            </button>
          </div>
        )}
      </div>

      {/* File preview overlay */}
      {previewFile && (
        <FilePreviewOverlay file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {/* Files overlay */}
      {showFiles && allFiles.length > 0 && (
        <FilesOverlay files={allFiles} onClose={() => setShowFiles(false)} />
      )}

      {/* Sidebar */}
      {sidebarOpen && <MobileSidebar onClose={() => setSidebarOpen(false)} />}
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
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
        </div>
      }
    >
      <MobileConversationInner id={id} />
    </Suspense>
  );
}
