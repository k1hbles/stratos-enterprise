'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Search,
  FileText,
  Lightbulb,
  ChevronRight,
  Cpu,
  Layers,
  ClipboardList,
  Terminal,
  Code2,
  ImageIcon,
  ListTodo,
  X,
  Download,
  Info,
  Share2,
  SlidersHorizontal,
  Mic,
  ArrowUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TextSegment = { type: 'text'; content: string };
type ThinkSegment = { type: 'think'; name: string; label: string; content: string; streaming: boolean; items: string[]; resultCount: number | null };
type ToolSegment  = { type: 'tool';  name: string; label: string; content: string; streaming: boolean; items: string[]; resultCount: number | null };
type ImageGeneratingSegment = { type: 'image_generating'; content: string };
type ImageResultSegment = { type: 'image_result'; content: string; src: string; prompt: string; imageId: string };
type Segment = TextSegment | ThinkSegment | ToolSegment | ImageGeneratingSegment | ImageResultSegment;

// ─── Icon map ─────────────────────────────────────────────────────────────────

const TOOL_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  search:   Search,
  file:     FileText,
  generate: Layers,
  think:    Lightbulb,
  plan:     ClipboardList,
  todo:     ListTodo,
  terminal: Terminal,
  python:   Code2,
  image:    ImageIcon,
  default:  Cpu,
};

function getToolIcon(name = '') {
  return TOOL_ICONS[name.toLowerCase()] ?? TOOL_ICONS.default;
}

// ─── Item parser ─────────────────────────────────────────────────────────────

function parseItemsFromContent(content: string): { items: string[]; resultCount: number | null; rawContent: string } {
  const items: string[] = [];
  let resultCount: number | null = null;
  // Extract <item>…</item> tags
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(content)) !== null) {
    const text = m[1].trim();
    if (text) items.push(text);
  }
  // Check last item for result count pattern like "(12 results)"
  if (items.length > 0) {
    const last = items[items.length - 1];
    const countMatch = last.match(/\((\d+)\s+results?\)/i);
    if (countMatch) resultCount = parseInt(countMatch[1], 10);
  }
  // Also check content directly for result count
  if (resultCount === null) {
    const directMatch = content.match(/(\d+)\s+results?\s+found/i);
    if (directMatch) resultCount = parseInt(directMatch[1], 10);
  }
  // Strip item tags from content to get raw remainder
  const rawContent = content.replace(/<item>[\s\S]*?<\/item>/g, '').trim();
  return { items, resultCount, rawContent };
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseStreamSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  // Match think, tool, image_generating, and image_result tags
  const tagRe = /<(think|tool|image_generating|image_result)([^>]*)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(raw)) !== null) {
    const tagStart  = match.index;
    const tagType   = match[1];
    const attrs     = match[2];

    if (tagStart > cursor) {
      const text = raw.slice(cursor, tagStart);
      if (text) segments.push({ type: 'text', content: text });
    }

    if (tagType === 'image_generating') {
      const closeTag = '</image_generating>';
      const closeIdx = raw.indexOf(closeTag, tagRe.lastIndex);
      if (closeIdx === -1) {
        // Still streaming — show shimmer
        segments.push({ type: 'image_generating', content: raw.slice(tagRe.lastIndex) });
        cursor = raw.length;
        break;
      } else {
        // Closed — shimmer done, skip it (image_result will follow)
        cursor = closeIdx + closeTag.length;
        tagRe.lastIndex = cursor;
      }
      continue;
    }

    if (tagType === 'image_result') {
      const srcMatch  = attrs.match(/src="([^"]+)"/);
      const promptMatch = attrs.match(/prompt="([^"]+)"/);
      const idMatch   = attrs.match(/id="([^"]+)"/);

      const closeTag = '</image_result>';
      const closeIdx = raw.indexOf(closeTag, tagRe.lastIndex);
      if (closeIdx === -1) {
        // Still streaming
        segments.push({
          type: 'image_result',
          content: '',
          src: srcMatch?.[1] ?? '',
          prompt: promptMatch?.[1] ?? '',
          imageId: idMatch?.[1] ?? '',
        });
        cursor = raw.length;
        break;
      } else {
        segments.push({
          type: 'image_result',
          content: '',
          src: srcMatch?.[1] ?? '',
          prompt: promptMatch?.[1] ?? '',
          imageId: idMatch?.[1] ?? '',
        });
        cursor = closeIdx + closeTag.length;
        tagRe.lastIndex = cursor;
      }
      continue;
    }

    // think / tool tags
    const nameMatch  = attrs.match(/name="([^"]+)"/);
    const labelMatch = attrs.match(/label="([^"]+)"/);
    const blockName  = nameMatch  ? nameMatch[1]  : tagType;
    const blockLabel = labelMatch ? labelMatch[1] : blockName;

    const closeTag = `</${tagType}>`;
    const closeIdx = raw.indexOf(closeTag, tagRe.lastIndex);

    if (closeIdx === -1) {
      const content = raw.slice(tagRe.lastIndex);
      const { items, resultCount } = parseItemsFromContent(content);
      segments.push({ type: tagType as 'think' | 'tool', name: blockName, label: blockLabel, content, streaming: true, items, resultCount });
      cursor = raw.length;
      break;
    } else {
      const content = raw.slice(tagRe.lastIndex, closeIdx);
      const { items, resultCount } = parseItemsFromContent(content);
      segments.push({ type: tagType as 'think' | 'tool', name: blockName, label: blockLabel, content, streaming: false, items, resultCount });
      cursor = closeIdx + closeTag.length;
      tagRe.lastIndex = cursor;
    }
  }

  if (cursor < raw.length) {
    segments.push({ type: 'text', content: raw.slice(cursor) });
  }

  return segments;
}

// ─── TextContent — full markdown rendering (bullets, headings, tables) ────────

function renderInline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s<>"',)\]]+)/g);
  if (parts.length === 1) return s;
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <span key={i} className="font-semibold">{part.slice(2, -2)}</span>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="text-[13px] px-1.5 py-0.5 rounded-md font-mono"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#c4c4c4' }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#5c9dff', textDecoration: 'underline', wordBreak: 'break-all' }}>
          {part}
        </a>
      );
    }
    return part;
  });
}

function parseTableRow(line: string): string[] {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

function isSeparatorRow(line: string): boolean {
  const cells = parseTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function isTableRow(line: string): boolean {
  return /^\|.*\|$/.test(line.trim());
}

function TextContent({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let tableHeaders: string[] | null = null;
  let tableRows: string[][] = [];
  let tableState: 'none' | 'header' | 'body' = 'none';
  let key = 0;

  const flushList = () => {
    if (!currentList.length) return;
    elements.push(
      <ul key={key++} className="flex flex-col gap-3 pl-1 my-1">
        {currentList.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="text-[#5c9dff] mt-1.5 text-[8px] shrink-0">●</span>
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    currentList = [];
  };

  const flushTable = () => {
    if (!tableHeaders && !tableRows.length) return;
    elements.push(
      <div key={key++} className="overflow-x-auto my-1 rounded-xl" style={{ border: '1px solid var(--border-default)' }}>
        <table className="w-full text-[14px] border-collapse">
          {tableHeaders && (
            <thead>
              <tr>
                {tableHeaders.map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-4 py-2 font-medium"
                    style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableHeaders = null;
    tableRows = [];
    tableState = 'none';
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (isTableRow(trimmed)) {
      flushList();
      if (tableState === 'none') {
        tableHeaders = parseTableRow(trimmed);
        tableState = 'header';
      } else if (tableState === 'header') {
        if (isSeparatorRow(trimmed)) {
          tableState = 'body';
        } else {
          tableRows.push(parseTableRow(trimmed));
          tableState = 'body';
        }
      } else {
        tableRows.push(parseTableRow(trimmed));
      }
      continue;
    }

    if (tableState !== 'none') flushTable();

    if (!trimmed) { flushList(); continue; }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) { currentList.push(bulletMatch[1]); continue; }

    flushList();

    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      elements.push(
        <div key={key++} className="font-semibold mt-2 mb-0.5 text-gray-100">
          {renderInline(headingMatch[1])}
        </div>
      );
      continue;
    }

    elements.push(<p key={key++}>{renderInline(trimmed)}</p>);
  }

  flushList();
  flushTable();

  return (
    <div className="text-[16px] text-gray-200 leading-relaxed flex flex-col gap-3">
      {elements}
    </div>
  );
}

// ─── StreamingChars ──────────────────────────────────────────────────────────

function StreamingChars({ text, done }: { text: string; done: boolean }) {
  const [displayed, setDisplayed] = useState(done ? text : '');
  const targetRef = useRef(text);

  useEffect(() => { targetRef.current = text; }, [text]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayed((prev) => {
        const target = targetRef.current;
        if (prev.length >= target.length) return prev;
        return target.slice(0, prev.length + 1);
      });
    }, 15);
    return () => clearInterval(interval);
  }, []);

  const caughtUp = displayed.length >= text.length;
  return <TextContent text={done && caughtUp ? text : displayed} />;
}

// ─── ImageGenerating — shimmer "Creating image..." ───────────────────────────

function ImageGenerating() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 0',
    }}>
      <span className="shimmer-text" style={{
        fontSize: 15,
        fontWeight: 400,
      }}>
        Creating image
      </span>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.4)',
        display: 'inline-block',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
    </div>
  );
}

// ─── ImageResult — inline thumbnail + fullscreen lightbox ────────────────────

function ImageResult({
  src, prompt, imageId, onEdit,
}: {
  src: string; prompt: string; imageId: string; onEdit?: (text: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => !error && setLightboxOpen(true)}
        style={{
          margin: '8px 0', maxWidth: 260, borderRadius: 16,
          overflow: 'hidden', cursor: error ? 'default' : 'pointer',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        {!loaded && !error && (
          <div style={{
            width: '100%', paddingBottom: '100%',
            background: 'rgba(255,255,255,0.06)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        )}
        {error && (
          <div style={{
            width: '100%', paddingBottom: '75%', position: 'relative',
            background: 'rgba(255,255,255,0.04)',
          }}>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              color: 'rgba(255,255,255,0.3)', fontSize: 12,
            }}>
              <ImageIcon size={24} strokeWidth={1.5} />
              <span>Image unavailable</span>
            </div>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src} alt={prompt}
          style={{
            width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover',
            opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease',
          }}
          onLoad={() => setLoaded(true)}
          onError={() => { console.error('[ImageResult] Failed to load image', src.slice(0, 80)); setError(true); }}
        />
      </div>

      {lightboxOpen && (
        <ImageLightbox
          src={src} prompt={prompt} imageId={imageId}
          onClose={() => setLightboxOpen(false)}
          onEdit={(text) => { onEdit?.(text); }}
        />
      )}
    </>
  );
}

// ─── Fullscreen lightbox with edit input ─────────────────────────────────────

function ImageLightbox({
  src, prompt, imageId, onClose, onEdit,
}: {
  src: string; prompt: string; imageId: string;
  onClose: () => void; onEdit: (editPrompt: string) => void;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = `stratos-${imageId.slice(0, 8)}.png`;
    a.click();
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        const res = await fetch(src);
        const blob = await res.blob();
        const file = new File([blob], 'image.png', { type: 'image/png' });
        await navigator.share({ files: [file] });
      } else {
        await navigator.clipboard.writeText(src);
      }
    } catch { /* user cancelled */ }
  };

  const handleEdit = () => {
    if (!editText.trim()) return;
    onEdit(editText.trim());
    setEditText('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[var(--bg-page)]"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
        >
          <X size={18} />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrompt((p) => !p)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              showPrompt
                ? 'bg-[var(--text-primary)] text-[var(--bg-page)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
            }`}
          >
            <Info size={18} />
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[14px] font-medium"
          >
            Save
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-2 rounded-full bg-[var(--text-primary)] text-[var(--bg-page)] text-[14px] font-medium"
          >
            Share
          </button>
        </div>
      </div>

      {/* Image — fills remaining space */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src} alt={prompt}
          className="max-w-full max-h-full object-contain rounded-xl"
        />

        {/* Prompt info overlay */}
        {showPrompt && (
          <div className="absolute inset-x-4 top-2 bg-[var(--bg-elevated)] rounded-2xl px-4 py-3 backdrop-blur-md z-10 border border-[var(--border-subtle)]">
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed m-0">{prompt}</p>
          </div>
        )}
      </div>

      {/* Bottom edit bar */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-2xl px-4 py-3 border border-[var(--border-strong)]">
          <SlidersHorizontal size={18} className="text-[var(--text-placeholder)] shrink-0" />
          <input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
            }}
            placeholder="Describe edits"
            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-placeholder)] text-[15px] outline-none no-focus-ring"
          />
          {editText.trim() ? (
            <button
              onClick={handleEdit}
              className="w-8 h-8 rounded-full bg-[var(--text-primary)] flex items-center justify-center shrink-0"
            >
              <ArrowUp size={16} className="text-[var(--bg-page)]" />
            </button>
          ) : (
            <Mic size={18} className="text-[var(--text-placeholder)] shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LinkPreview — OG card shown below text containing a URL ─────────────────

interface LinkPreviewData {
  title: string;
  description: string;
  image: string;
  domain: string;
}

const LinkPreview = memo(function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<LinkPreviewData | null>(null);

  useEffect(() => {
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.title) setData(d); })
      .catch(() => {});
  }, [url]);

  if (!data) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', gap: 10, padding: '10px 12px',
        borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)', textDecoration: 'none',
        marginTop: 6, overflow: 'hidden',
      }}
    >
      {data.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.image} alt="" style={{ width: 60, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.title}</span>
        {data.description && (
          <span style={{ fontSize: 12, color: '#888', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {data.description}
          </span>
        )}
        <span style={{ fontSize: 11, color: '#555' }}>{data.domain}</span>
      </div>
    </a>
  );
});

function extractUrls(text: string): string[] {
  const urlRe = /https?:\/\/[^\s<>"',)\]]+/g;
  const matches = Array.from(text.matchAll(urlRe)).map((m) => m[0]);
  return [...new Set(matches)].slice(0, 3);
}

// ─── StreamBlock ──────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  search:   'Search',
  file:     'Read',
  generate: 'Generate',
  think:    'Think',
  plan:     'Plan',
  todo:     'Todo',
  terminal: 'Terminal',
  python:   'Python',
  image:    'Image',
  default:  'Action',
};

function PlanContent({ content }: { content: string }) {
  const lines = content.split('\n').filter((l) => l.trim());
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('SECTION:')) {
          return (
            <div key={i} className="flex items-start gap-2 text-gray-200">
              <span className="text-gray-500 shrink-0">§</span>
              <span className="font-semibold">{trimmed.slice(8).trim()}</span>
            </div>
          );
        }
        if (trimmed.startsWith('SLIDE:')) {
          return (
            <div key={i} className="flex items-start gap-2 text-gray-200">
              <span className="text-gray-500 shrink-0">▸</span>
              <span className="font-semibold">{trimmed.slice(6).trim()}</span>
            </div>
          );
        }
        if (trimmed.startsWith('SHEET:')) {
          return (
            <div key={i} className="flex items-start gap-2 text-gray-200">
              <span className="text-gray-500 shrink-0">⊞</span>
              <span className="font-semibold">{trimmed.slice(6).trim()}</span>
            </div>
          );
        }
        if (trimmed.startsWith('ROW:')) {
          return (
            <div key={i} className="flex items-start gap-2 text-gray-400 text-[12px] pl-5">
              <span className="shrink-0">–</span>
              <span>{trimmed.slice(4).trim()}</span>
            </div>
          );
        }
        if (trimmed.startsWith('RATIONALE:')) {
          return (
            <div
              key={i}
              className="text-gray-500 text-[12px] italic pl-5 ml-1"
              style={{ borderLeft: '2px solid rgba(255,255,255,0.08)', paddingLeft: '8px' }}
            >
              {trimmed.slice(10).trim()}
            </div>
          );
        }
        return (
          <div key={i} className="text-gray-400 text-[13px]">
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

const SPINNER_NAMES = new Set(['generate', 'search', 'terminal', 'python', 'image']);

function BlockIcon({ name, type, isStreaming }: { name: string; type: 'think' | 'tool'; isStreaming: boolean }) {
  const useSpinner = isStreaming && SPINNER_NAMES.has(name.toLowerCase());

  if (useSpinner) {
    return (
      <svg
        className="shrink-0 text-gray-400"
        width="15" height="15" viewBox="0 0 15 15"
        fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        style={{ animation: 'spin 0.8s linear infinite' }}
      >
        <circle cx="7.5" cy="7.5" r="6" strokeOpacity="0.25" />
        <path d="M7.5 1.5a6 6 0 0 1 6 6" />
      </svg>
    );
  }

  const Icon = type === 'think' ? Lightbulb : getToolIcon(name);
  return <Icon size={15} strokeWidth={1.5} className="shrink-0 text-gray-400" />;
}

function parseResultCount(label: string): string | null {
  const m = label.match(/(\d+)\s+results?/i);
  return m ? m[1] : null;
}

function StreamBlock({
  type, name, label, content, isStreaming, items, resultCount,
}: {
  type: 'think' | 'tool';
  name: string;
  label: string;
  content: string;
  isStreaming: boolean;
  items: string[];
  resultCount: number | null;
}) {
  const [open, setOpen] = useState(false);
  const actionLabel = type === 'think' ? 'Think' : (ACTION_LABELS[name.toLowerCase()] ?? 'Action');
  // Fallback: parse result count from content if not passed via items
  const displayCount = resultCount ?? (name === 'search' ? parseResultCount(content) : null);
  const { rawContent } = parseItemsFromContent(content);

  // Auto-expand when streaming starts
  useEffect(() => {
    if (isStreaming) setOpen(true);
  }, [isStreaming]);

  // Auto-collapse after streaming ends (except "generate" blocks — user is waiting on those)
  useEffect(() => {
    if (isStreaming) return;
    if (type === 'tool' && name === 'generate') return;
    const t = setTimeout(() => setOpen(false), 600);
    return () => clearTimeout(t);
  }, [type, name, isStreaming]);

  // Empty completed blocks → compact inline status (no block wrapper)
  if (!isStreaming && items.length === 0 && !rawContent) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 0',
        fontSize: 13,
        color: 'var(--action-text)',
        animation: 'fadeSlideIn 0.2s ease forwards',
      }}>
        <BlockIcon name={name} type={type} isStreaming={false} />
        <span style={{ color: 'var(--action-label)', fontWeight: 500 }}>{actionLabel}</span>
        <span style={{ color: 'var(--action-separator)' }}>|</span>
        <span style={{ color: 'var(--action-text)' }}>{label || name}</span>
        <span style={{
          fontSize: 11, color: 'var(--action-dot)', fontWeight: 500, marginLeft: 'auto',
        }}>done</span>
      </div>
    );
  }

  return (
    <div
      style={{
        animation: 'fadeSlideIn 0.2s ease forwards',
        marginBottom: 2,
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          background: 'var(--action-bg)',
          border: '1px solid var(--action-border)',
          borderRadius: items.length > 0 && (open || isStreaming) ? '14px 14px 0 0' : 14,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <BlockIcon name={name} type={type} isStreaming={isStreaming} />

        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--action-label)', flexShrink: 0 }}>
          {isStreaming && type === 'think' ? 'Thinking...' : actionLabel}
        </span>

        <span style={{ color: 'var(--action-separator)', fontSize: 13, flexShrink: 0 }}>|</span>

        <span style={{
          fontSize: 14, color: 'var(--action-text)', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label || name}
        </span>

        {displayCount && (
          <span style={{
            fontSize: 11, fontWeight: 500,
            padding: '2px 8px', borderRadius: 99,
            background: 'rgba(92,157,255,0.12)', color: '#5c9dff',
            flexShrink: 0,
          }}>
            {displayCount}
          </span>
        )}

        <ChevronRight
          size={14}
          strokeWidth={1.5}
          style={{
            color: '#555',
            flexShrink: 0,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {/* Sub-bullet items — visible when streaming or manually expanded */}
      {items.length > 0 && (open || isStreaming) && (
        <div style={{
          position: 'relative',
          borderLeft: '1px solid var(--action-border)',
          borderRight: '1px solid var(--action-border)',
          borderBottom: open ? 'none' : '1px solid var(--action-border)',
          borderRadius: open ? 0 : '0 0 14px 14px',
          background: 'var(--action-bg)',
          paddingLeft: 44,
          paddingRight: 12,
          paddingTop: 4,
          paddingBottom: 8,
        }}>
          {/* Connector line */}
          <div style={{
            position: 'absolute',
            left: 23,
            top: 0,
            bottom: 0,
            width: 1,
            background: 'var(--action-border)',
          }} />

          {items.map((item, idx) => (
            <div
              key={idx}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '3px 0',
                fontSize: 13,
                color: 'var(--action-text)',
              }}
            >
              {/* Dot on connector line */}
              <div style={{
                position: 'absolute',
                left: -25,
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: isStreaming && idx === items.length - 1 ? '#5c9dff' : 'var(--action-dot)',
              }} />
              <span style={{ flex: 1 }}>{item}</span>
              <ChevronRight size={11} strokeWidth={1.5} style={{ color: 'var(--action-icon)', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      {/* Collapsible raw content */}
      {open && rawContent && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            padding: '8px 12px 10px',
            borderLeft: '1px solid var(--action-border)',
            borderRight: '1px solid var(--action-border)',
            borderBottom: '1px solid var(--action-border)',
            borderRadius: '0 0 14px 14px',
            background: 'var(--action-bg)',
          }}
        >
          {name === 'plan' ? (
            <PlanContent content={rawContent} />
          ) : (
            <div style={{ color: 'var(--action-text)', whiteSpace: 'pre-wrap' }}>
              {rawContent}
            </div>
          )}
          {isStreaming && (
            <span
              style={{
                display: 'inline-block',
                verticalAlign: 'bottom',
                width: 2,
                height: '1em',
                background: '#5c9dff',
                marginLeft: 2,
                animation: 'blink 1s step-end infinite',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function StreamingMessage({
  content,
  done,
  onSendMessage,
}: {
  content: string;
  done: boolean;
  onSendMessage?: (text: string) => void;
}) {
  const segments = parseStreamSegments(content);

  return (
    <>
      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes textReveal {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .animate-text-reveal { animation: textReveal 0.4s ease-out forwards; }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.3) 0%,
            rgba(255,255,255,0.8) 40%,
            rgba(255,255,255,0.3) 80%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2s linear infinite;
        }
      `}</style>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            const urls = done ? extractUrls(seg.content) : [];
            return (
              <div key={i}>
                <StreamingChars text={seg.content} done={done} />
                {urls.map((url) => <LinkPreview key={url} url={url} />)}
              </div>
            );
          }
          if (seg.type === 'think') {
            return (
              <StreamBlock
                key={i}
                type="think"
                name="think"
                label="Reasoning"
                content={seg.content}
                isStreaming={seg.streaming}
                items={seg.items}
                resultCount={seg.resultCount}
              />
            );
          }
          if (seg.type === 'tool') {
            return (
              <StreamBlock
                key={i}
                type="tool"
                name={seg.name}
                label={seg.label}
                content={seg.content}
                isStreaming={seg.streaming}
                items={seg.items}
                resultCount={seg.resultCount}
              />
            );
          }
          if (seg.type === 'image_generating') {
            return <ImageGenerating key={i} />;
          }
          if (seg.type === 'image_result') {
            return (
              <ImageResult
                key={i}
                src={seg.src}
                prompt={seg.prompt}
                imageId={seg.imageId}
                onEdit={onSendMessage}
              />
            );
          }
          return null;
        })}
      </div>
    </>
  );
}

// ─── Re-export shared helpers (used by SSE consumers to build raw XML) ───────
export { sanitizeAttr, sanitizeContent, toolNameToIcon, toolCallLabel, isPipelineTool, parsePhaseMarker, parseTextMarker } from '@/lib/ai/openclaw/stream-helpers';
