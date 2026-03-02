'use client';

import { useState } from 'react';
import {
  FileText, BarChart3, Search, Globe, FileCheck,
  FileSpreadsheet, File, Loader2, Lightbulb,
  ChevronDown, Copy, ThumbsUp, ThumbsDown,
  ExternalLink, Download, RefreshCw, Brain,
  Database, Terminal, Clock, Check,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────── */
export interface SearchExpandData {
  type: 'search_results';
  results: Array<{ title: string; url: string; snippet: string }>;
}
export interface FileExpandData {
  type: 'file_output';
  fileType: 'pdf' | 'xlsx' | 'pptx' | 'docx';
  fileName: string;
  downloadUrl: string;
  previewHtml?: string;
}
export type ExpandData = SearchExpandData | FileExpandData;

export interface ActionItem {
  id: string;
  toolName: string;
  status: 'running' | 'completed';
  summary?: string;
  expandData?: ExpandData;
}
export interface TextBlock        { type: 'text'; content: string; }
export interface ActionGroupBlock { type: 'actionGroup'; actions: ActionItem[]; }
export interface DiagramBlock     { type: 'diagram'; definition: string; title?: string; }
export type Block = TextBlock | ActionGroupBlock | DiagramBlock;

export interface TaskFile {
  fileName: string;
  downloadUrl: string;
  fileSize?: number;
}

/* ── Tool config ────────────────────────────────────────────────── */
const TOOL_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  web_search:            { icon: Search,          label: 'Searching the web'    },
  web_scrape:            { icon: Globe,           label: 'Reading page'         },
  web_fetch:             { icon: Globe,           label: 'Fetching URL'         },
  think:                 { icon: Brain,           label: 'Thinking'             },
  query_memory:          { icon: Database,        label: 'Recalling memory'     },
  store_memory:          { icon: Database,        label: 'Saving to memory'     },
  get_current_time:      { icon: Clock,           label: 'Checking time'        },
  parse_file:            { icon: FileText,        label: 'Reading file'         },
  read_uploaded_file:    { icon: FileText,        label: 'Reading file'         },
  execute_python:        { icon: Terminal,        label: 'Running code'         },
  create_chart:          { icon: BarChart3,       label: 'Creating chart'       },
  generate_pdf:          { icon: FileText,        label: 'Generating PDF'       },
  generate_document:     { icon: File,            label: 'Writing document'     },
  generate_spreadsheet:  { icon: FileSpreadsheet, label: 'Building spreadsheet' },
  generate_report:       { icon: FileText,        label: 'Compiling report'     },
  generate_presentation: { icon: File,            label: 'Creating slides'      },
  verify_output:         { icon: FileCheck,       label: 'Verifying output'     },
};

function getToolConfig(toolName: string) {
  return TOOL_CONFIG[toolName] ?? { icon: Lightbulb, label: toolName.replace(/_/g, ' ') };
}

/* ── Expand content ─────────────────────────────────────────────── */
function ExpandContent({ data }: { data: ExpandData }) {
  if (data.type === 'search_results') {
    return (
      <div className="flex flex-col gap-3 pt-2 pb-1">
        {data.results.slice(0, 4).map((r, i) => {
          let hostname = '';
          try { hostname = new URL(r.url).hostname; } catch { /* ignore */ }
          return (
            <div key={i} className="flex flex-col gap-0.5">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px] font-medium leading-snug"
                style={{ color: 'rgba(255,255,255,0.80)', textDecoration: 'none' }}
              >
                {hostname && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
                    alt=""
                    width={14}
                    height={14}
                    className="flex-shrink-0 rounded-sm"
                  />
                )}
                <span className="flex-1">{r.title}</span>
                <ExternalLink size={10} className="flex-shrink-0 mt-0.5 opacity-50" />
              </a>
              <span className="font-mono text-[10px] truncate" style={{ color: '#A78BFA' }}>
                {r.url}
              </span>
              <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.40)' }}>
                {r.snippet}
              </p>
            </div>
          );
        })}
      </div>
    );
  }
  if (data.type === 'file_output') {
    return (
      <div className="flex items-center justify-between gap-2 pt-2 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.80)' }}>
            {data.fileName}
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.18)', color: '#818CF8' }}
          >
            {data.fileType}
          </span>
        </div>
        <a
          href={data.downloadUrl}
          download={data.fileName}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] flex-shrink-0"
          style={{ color: '#818CF8', background: 'rgba(99,102,241,0.10)' }}
        >
          <Download size={11} strokeWidth={2} />
          Download
        </a>
      </div>
    );
  }
  return null;
}

/* ── Single action row ──────────────────────────────────────────── */
function ActionRow({ action, isLast }: { action: ActionItem; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const { icon: Icon, label } = getToolConfig(action.toolName);
  const isRunning = action.status === 'running';
  const canExpand = !isRunning && !!action.expandData;
  const displayLabel = action.summary || label;

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <button
        onClick={() => canExpand && setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 transition-colors duration-150"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: canExpand ? 'pointer' : 'default',
          minHeight: '36px',
        }}
        onMouseEnter={(e) => { if (canExpand) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isRunning
            ? <Loader2 size={13} strokeWidth={1.5} className="animate-spin" style={{ color: 'rgba(167,139,250,0.9)' }} />
            : <Check size={12} strokeWidth={2.5} style={{ color: 'rgba(255,255,255,0.22)' }} />
          }
        </div>
        <Icon size={13} strokeWidth={1.5} style={{ flexShrink: 0, color: isRunning ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.25)' }} />
        <span className="flex-1 truncate text-[12.5px]" style={{ color: isRunning ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.35)' }}>
          {displayLabel}
        </span>
        {canExpand && (
          <ChevronDown
            size={12}
            strokeWidth={1.5}
            className="flex-shrink-0 transition-transform duration-200"
            style={{ color: 'rgba(255,255,255,0.25)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        )}
      </button>
      {open && action.expandData && (
        <div className="px-3 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <ExpandContent data={action.expandData} />
        </div>
      )}
    </div>
  );
}

/* ── Action group card ──────────────────────────────────────────── */
// Renders as a full-width block — fixes the "floating up" issue.
// The parent in conversation-view.tsx wraps this in a div with ml-[48px].
export function ActionGroupCard({ actions }: { actions: ActionItem[] }) {
  if (!actions?.length) return null;
  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {actions.map((action, i) => (
        <ActionRow key={action.id} action={action} isLast={i === actions.length - 1} />
      ))}
    </div>
  );
}

/* ── File output card ───────────────────────────────────────────── */
export function FileOutputCard({ file, onClick }: { file: TaskFile; onClick: () => void }) {
  const ext = file.fileName.split('.').pop()?.toLowerCase() ?? '';
  let cfgKey = 'generate_document';
  if (['xlsx', 'xls', 'csv'].includes(ext)) cfgKey = 'generate_spreadsheet';
  else if (ext === 'pdf') cfgKey = 'generate_pdf';
  const { icon: Icon } = getToolConfig(cfgKey);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 text-left transition-colors duration-150 w-full"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding: '10px 12px',
        cursor: 'pointer',
        maxWidth: '260px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <Icon size={16} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.50)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium truncate leading-tight" style={{ color: 'rgba(255,255,255,0.82)' }}>
          {file.fileName}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Tap to preview
        </p>
      </div>
    </button>
  );
}

/* ── Reaction bar ───────────────────────────────────────────────── */
export function ReactionBar({ content, onRetry }: { content: string; onRetry?: () => void }) {
  const [liked, setLiked] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const dim = 'rgba(255,255,255,0.28)';
  const lit  = 'rgba(255,255,255,0.70)';
  const btnBase = { background: 'transparent', border: 'none', cursor: 'pointer' };

  return (
    <div className="flex items-center gap-0.5" style={{ paddingTop: '4px' }}>
      <button onClick={handleCopy} className="p-1.5 rounded-lg transition-colors" style={{ ...btnBase, color: copied ? lit : dim }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} title={copied ? 'Copied!' : 'Copy'}>
        <Copy size={14} strokeWidth={1.5} />
      </button>
      {onRetry && (
        <button onClick={onRetry} className="p-1.5 rounded-lg transition-colors" style={{ ...btnBase, color: dim }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} title="Regenerate">
          <RefreshCw size={14} strokeWidth={1.5} />
        </button>
      )}
      <button onClick={() => setLiked(liked === 'up' ? null : 'up')} className="p-1.5 rounded-lg transition-colors" style={{ ...btnBase, color: liked === 'up' ? lit : dim }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} title="Good">
        <ThumbsUp size={14} strokeWidth={1.5} />
      </button>
      <button onClick={() => setLiked(liked === 'down' ? null : 'down')} className="p-1.5 rounded-lg transition-colors" style={{ ...btnBase, color: liked === 'down' ? lit : dim }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} title="Bad">
        <ThumbsDown size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

/* ── Claude-style action block (per-tool, with vertical bar) ───── */
export function ClaudeActionBlock({ action }: { action: ActionItem }) {
  const [open, setOpen] = useState(false);
  const { icon: Icon, label } = getToolConfig(action.toolName);
  const isRunning = action.status === 'running';
  const canExpand = !isRunning && !!action.expandData;
  const displayLabel = action.summary || (isRunning ? label : label.replace(/ing\b/, 'ed'));

  return (
    <div className="flex gap-3">
      {/* Vertical left border — pulses while running */}
      <div
        className={`w-[2px] self-stretch rounded-full ${
          isRunning ? 'animate-border-pulse bg-[#A78BFA]' : 'bg-[#3C3C3E]'
        }`}
      />

      {/* Content */}
      <div className="flex-1 py-1">
        {/* Collapsed row: icon + label + chevron */}
        <button
          onClick={() => canExpand && setOpen((o) => !o)}
          className="flex items-center gap-2 w-full text-left"
          style={{ cursor: canExpand ? 'pointer' : 'default' }}
        >
          <Icon
            size={14}
            style={{
              color: isRunning ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)',
            }}
          />
          <span
            className="flex-1 text-[13px]"
            style={{
              color: isRunning ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.4)',
            }}
          >
            {displayLabel}
          </span>
          {isRunning && (
            <Loader2 size={12} className="animate-spin" style={{ color: '#A78BFA' }} />
          )}
          {!isRunning && canExpand && (
            <ChevronDown
              size={12}
              style={{
                color: 'rgba(255,255,255,0.25)',
                transform: open ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          )}
          {!isRunning && !canExpand && (
            <Check size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
          )}
        </button>

        {/* Expanded content (search results with favicons, etc.) */}
        {open && action.expandData && <ExpandContent data={action.expandData} />}
      </div>
    </div>
  );
}
