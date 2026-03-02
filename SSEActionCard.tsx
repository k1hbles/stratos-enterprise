'use client';

import { useState } from 'react';
import {
  FileText, BarChart3, Search, Globe, FileCheck,
  FileSpreadsheet, File, Loader2, Lightbulb,
  ChevronRight, Copy, ThumbsUp, ThumbsDown,
  ExternalLink, Download, RefreshCw, Brain,
  Database, Terminal, Clock, Check,
} from 'lucide-react';

/* ── Shared types ──────────────────────────────────────────────── */
export interface SearchExpandData {
  type: "search_results";
  results: Array<{ title: string; url: string; snippet: string }>;
}

export interface FileExpandData {
  type: "file_output";
  fileType: "pdf" | "xlsx" | "pptx" | "docx";
  fileName: string;
  downloadUrl: string;
  previewHtml?: string;
}

export type ExpandData = SearchExpandData | FileExpandData;

export interface StepData {
  toolId: string;
  toolName: string;
  status: 'running' | 'completed';
  summary?: string;
  detail?: string;
  args?: Record<string, unknown>;
  expandData?: ExpandData;
}

export interface TaskFile {
  fileName: string;
  downloadUrl: string;
  fileSize?: number;
}

/* ── Block types ───────────────────────────────────────────────── */
export interface TextBlock        { type: 'text'; content: string; }
export interface ActionItem {
  id: string;
  toolName: string;
  status: 'running' | 'completed';
  summary?: string;
  expandData?: ExpandData;
}
export interface ActionGroupBlock { type: 'actionGroup'; actions: ActionItem[]; }
export type Block = TextBlock | ActionGroupBlock;

/* ── Tool config: icon + human label ──────────────────────────── */
const TOOL_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  web_search:           { icon: Search,          label: 'Searching the web' },
  web_scrape:           { icon: Globe,           label: 'Reading page' },
  web_fetch:            { icon: Globe,           label: 'Fetching URL' },
  think:                { icon: Brain,           label: 'Thinking' },
  query_memory:         { icon: Database,        label: 'Recalling memory' },
  store_memory:         { icon: Database,        label: 'Saving to memory' },
  get_current_time:     { icon: Clock,           label: 'Checking time' },
  parse_file:           { icon: FileText,        label: 'Reading file' },
  read_uploaded_file:   { icon: FileText,        label: 'Reading file' },
  execute_python:       { icon: Terminal,        label: 'Running code' },
  create_chart:         { icon: BarChart3,       label: 'Creating chart' },
  generate_pdf:         { icon: FileText,        label: 'Generating PDF' },
  generate_document:    { icon: File,            label: 'Writing document' },
  generate_spreadsheet: { icon: FileSpreadsheet, label: 'Building spreadsheet' },
  generate_report:      { icon: FileText,        label: 'Compiling report' },
  generate_presentation:{ icon: File,            label: 'Creating slides' },
  verify_output:        { icon: FileCheck,       label: 'Verifying output' },
};

function getToolConfig(toolName: string) {
  return TOOL_CONFIG[toolName] ?? { icon: Lightbulb, label: toolName.replace(/_/g, ' ') };
}

/* ── Expandable Result Content ────────────────────────────────── */
function ExpandContent({ data }: { data: ExpandData }) {
  if (data.type === 'search_results') {
    return (
      <div className="space-y-3 pt-2">
        {data.results.slice(0, 5).map((res, i) => (
          <div key={i} className="group flex flex-col gap-0.5">
            <a
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-medium hover:underline decoration-white/30 underline-offset-2"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {res.title}
              <ExternalLink size={10} className="opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
            </a>
            <span className="font-mono text-[10px] truncate" style={{ color: '#A78BFA' }}>
              {res.url}
            </span>
            <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {res.snippet}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (data.type === 'file_output') {
    return (
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {data.fileName}
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8' }}
            >
              {data.fileType}
            </span>
          </div>
          <a
            href={data.downloadUrl}
            download={data.fileName}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors flex-shrink-0"
            style={{ color: '#818CF8' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Download size={12} strokeWidth={2} />
            Download
          </a>
        </div>
        {data.previewHtml && (
          <div className="relative rounded overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <iframe
              srcDoc={data.previewHtml}
              className="w-full max-h-[180px] border-0 pointer-events-none"
              title="File Preview"
              sandbox="allow-scripts"
            />
            <div
              className="absolute inset-x-0 bottom-0 h-10 pointer-events-none"
              style={{ background: 'linear-gradient(to top, #111118, transparent)' }}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}

/* ── Single action row ─────────────────────────────────────────── */
function ActionItemRow({ action, isLast }: { action: ActionItem; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { icon: Icon, label } = getToolConfig(action.toolName);
  const displayLabel = action.summary || label;
  const isRunning = action.status === 'running';
  const canExpand = action.status === 'completed' && !!action.expandData;

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
      <button
        onClick={() => canExpand && setExpanded(!expanded)}
        className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 transition-colors duration-150"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: canExpand ? 'pointer' : 'default',
        }}
        onMouseEnter={(e) => { if (canExpand) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Status indicator */}
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {isRunning ? (
            <Loader2
              size={13}
              strokeWidth={1.5}
              className="animate-spin"
              style={{ color: 'rgba(139,92,246,0.8)' }}
            />
          ) : (
            <Check size={12} strokeWidth={2.5} style={{ color: 'rgba(255,255,255,0.25)' }} />
          )}
        </div>

        {/* Tool icon */}
        <Icon
          size={13}
          strokeWidth={1.5}
          style={{ color: isRunning ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)', flexShrink: 0 }}
        />

        {/* Label */}
        <span
          className="flex-1 text-[12.5px] truncate"
          style={{ color: isRunning ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.35)' }}
        >
          {displayLabel}
        </span>

        {/* Expand chevron */}
        {canExpand && (
          <ChevronRight
            size={12}
            strokeWidth={1.5}
            className="flex-shrink-0 transition-transform duration-200"
            style={{
              color: 'rgba(255,255,255,0.25)',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          />
        )}
      </button>

      {/* Expanded content */}
      {expanded && action.expandData && (
        <div
          className="px-3 pb-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <ExpandContent data={action.expandData} />
        </div>
      )}
    </div>
  );
}

/* ── Action group card ─────────────────────────────────────────── */
export function ActionGroupCard({ actions }: { actions: ActionItem[] }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden inline-flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        minWidth: '220px',
        maxWidth: '100%',
      }}
    >
      {actions.map((action, i) => (
        <ActionItemRow
          key={action.id}
          action={action}
          isLast={i === actions.length - 1}
        />
      ))}
    </div>
  );
}

/* ── File output card ──────────────────────────────────────────── */
export function FileOutputCard({ file, onClick }: { file: TaskFile; onClick: () => void }) {
  const ext = file.fileName.split('.').pop()?.toLowerCase() ?? '';
  let cfgKey = 'generate_document';
  if (['xlsx', 'xls', 'csv'].includes(ext)) cfgKey = 'generate_spreadsheet';
  else if (ext === 'pdf') cfgKey = 'generate_pdf';
  const { icon: Icon } = getToolConfig(cfgKey);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 text-left transition-colors duration-150 animate-fade-in-up"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding: '8px 12px',
        width: '220px',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <Icon size={15} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.5)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium truncate leading-tight" style={{ color: 'rgba(255,255,255,0.82)' }}>
          {file.fileName}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Click to preview
        </p>
      </div>
    </button>
  );
}

/* ── Reaction bar ──────────────────────────────────────────────── */
export function ReactionBar({ content, onRetry }: { content: string; onRetry?: () => void }) {
  const [liked, setLiked] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const base = 'rgba(255,255,255,0.30)';
  const active = 'rgba(255,255,255,0.70)';

  return (
    <div className="flex items-center gap-0.5 pt-1 animate-fade-in" style={{ height: '28px', marginLeft: '48px' }}>
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md transition-colors duration-150"
        style={{ color: copied ? active : base, background: 'transparent', border: 'none', cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title={copied ? 'Copied!' : 'Copy'}
      >
        <Copy size={14} strokeWidth={1.5} />
      </button>
      {onRetry && (
        <button
          onClick={onRetry}
          className="p-1.5 rounded-md transition-colors duration-150"
          style={{ color: base, background: 'transparent', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          title="Regenerate"
        >
          <RefreshCw size={14} strokeWidth={1.5} />
        </button>
      )}
      <button
        onClick={() => setLiked(liked === 'up' ? null : 'up')}
        className="p-1.5 rounded-md transition-colors duration-150"
        style={{ color: liked === 'up' ? active : base, background: 'transparent', border: 'none', cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title="Good response"
      >
        <ThumbsUp size={14} strokeWidth={1.5} />
      </button>
      <button
        onClick={() => setLiked(liked === 'down' ? null : 'down')}
        className="p-1.5 rounded-md transition-colors duration-150"
        style={{ color: liked === 'down' ? active : base, background: 'transparent', border: 'none', cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title="Bad response"
      >
        <ThumbsDown size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}
