'use client';

import { useState } from 'react';
import {
  FileText, BarChart3, Search, Globe, FileCheck,
  FileSpreadsheet, File, Loader2, Lightbulb,
  CheckCircle2, ChevronRight, Copy, ThumbsUp, ThumbsDown,
  ArrowDown, ExternalLink, Download, FileType
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

/* ── Tool icon map ─────────────────────────────────────────────── */
const TOOL_ICONS: Record<string, React.ElementType> = {
  parse_file: FileText,
  create_chart: BarChart3,
  generate_pdf: FileText,
  generate_document: File,
  generate_spreadsheet: FileSpreadsheet,
  generate_report: FileText,
  generate_presentation: File,
  verify_output: FileCheck,
  web_search: Search,
  web_fetch: Globe,
  think: Lightbulb,
};

/* ── Expandable Result Content ────────────────────────────────── */
function ExpandContent({ data }: { data: ExpandData }) {
  if (data.type === 'search_results') {
    return (
      <div className="space-y-4 pt-1">
        {data.results.slice(0, 5).map((res, i) => (
          <div key={i} className="group flex flex-col gap-1">
            <a 
              href={res.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[13px] font-semibold text-white hover:underline decoration-white/30 underline-offset-2 flex items-center gap-1.5"
            >
              {res.title}
              <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <span className="font-mono text-[11px] text-[#A78BFA] truncate max-w-full">
              {res.url}
            </span>
            <p className="text-[12px] text-white/60 leading-relaxed line-clamp-2">
              {res.snippet}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (data.type === 'file_output') {
    const isPptx = data.fileType === 'pptx';
    const isXlsx = data.fileType === 'xlsx';
    const isPdf = data.fileType === 'pdf';
    
    return (
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-[13px] font-medium text-white/90">
              {data.fileName}
            </span>
            <span className="px-1.5 py-0.5 rounded-sm bg-[#6366F1]/20 text-[#6366F1] text-[10px] font-bold tracking-wider uppercase">
              {data.fileType}
            </span>
          </div>
          <a 
            href={data.downloadUrl}
            download={data.fileName}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px] text-[#6366F1] hover:bg-[#6366F1]/10 transition-colors shrink-0"
          >
            <Download size={13} strokeWidth={2} />
            Download
          </a>
        </div>
        
        {data.previewHtml && (
          <div className="relative mt-2 rounded-md border border-white/5 overflow-hidden bg-black/20">
            <iframe 
              srcDoc={data.previewHtml}
              className="w-full max-h-[200px] border-0 pointer-events-none"
              title="File Preview"
              sandbox="allow-scripts"
            />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#111118] to-transparent pointer-events-none" />
          </div>
        )}
      </div>
    );
  }

  return null;
}

/* ── SSE Action Card (Kimi-style) ─────────────────────────────── */
export function SSEActionCard({ step, isLast = false }: { step: StepData; isLast?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TOOL_ICONS[step.toolName] || FileText;
  const hasExpandData = !!step.expandData;

  return (
    <div
      className="animate-fade-in-up flex flex-col overflow-hidden"
      style={{
        borderBottom: isLast ? 'none' : '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      <button
        onClick={() => hasExpandData && setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left hover:bg-white/[0.02] transition-colors duration-150"
        style={{
          padding: '8px 12px',
          height: '36px',
          cursor: hasExpandData ? 'pointer' : 'default',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.56)',
          background: 'transparent',
          border: 'none',
        }}
      >
        <div className="flex-shrink-0">
          {step.status === 'running' ? (
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" style={{ opacity: 0.4 }} />
              <Loader2 size={14} strokeWidth={1.5} className="animate-spin relative z-10" style={{ color: 'rgba(255,255,255,0.50)' }} />
            </div>
          ) : (
            <Icon size={14} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.40)' }} />
          )}
        </div>
        <span className="flex-1 min-w-0 truncate">
          {step.toolName.replace(/_/g, ' ')}
        </span>
        {step.summary && (
          <span className="flex-shrink-0 text-[12px]" style={{ color: 'rgba(255,255,255,0.32)' }}>
            {step.summary}
          </span>
        )}
        {hasExpandData && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-shrink-0"
          >
            <ChevronRight
              size={14}
              strokeWidth={1.5}
              style={{ color: 'rgba(255,255,255,0.32)' }}
            />
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {expanded && step.expandData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 pb-4 pt-3 overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.01)',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <ExpandContent data={step.expandData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Task summary header (first row in container) ─────────────── */
export function TaskHeaderRow({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full flex items-center gap-2 text-left hover:bg-white/[0.02] transition-colors duration-150 animate-fade-in-up"
      style={{
        padding: '8px 12px',
        height: '36px',
        cursor: 'pointer',
        fontSize: '14px',
        color: 'rgba(255,255,255,0.84)',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        background: 'transparent',
        border: 'none',
        borderBlockEnd: '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center"
        style={{ background: 'rgba(52,199,89,0.15)' }}
      >
        <Lightbulb size={10} strokeWidth={2} style={{ color: 'rgb(52,199,89)' }} />
      </div>
      <span className="flex-1 min-w-0 truncate font-medium">
        {summary}
      </span>
      <ChevronRight
        size={14}
        strokeWidth={1.5}
        className="flex-shrink-0 transition-transform duration-200"
        style={{
          color: 'rgba(255,255,255,0.32)',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}
      />
    </button>
  );
}

/* ── Steps group container (Kimi container-block) ─────────────── */
export function StepsGroupContainer({
  taskSummary,
  steps,
}: {
  taskSummary?: string;
  steps: StepData[];
}) {
  return (
    <div
      className="animate-fade-in-up"
      style={{
        border: '0.5px solid rgba(255,255,255,0.12)',
        borderRadius: '10px',
        background: 'transparent',
        overflow: 'hidden',
        marginBottom: '12px',
      }}
    >
      {taskSummary && <TaskHeaderRow summary={taskSummary} />}
      {steps.map((step, i) => (
        <SSEActionCard
          key={step.toolId}
          step={step}
          isLast={i === steps.length - 1}
        />
      ))}
    </div>
  );
}

/* ── File output card (Kimi-style compact) ────────────────────── */
export function FileOutputCard({
  file,
  onClick,
}: {
  file: TaskFile;
  onClick: () => void;
}) {
  const ext = file.fileName.split('.').pop()?.toLowerCase() ?? '';
  let iconKey = 'generate_document';
  if (['xlsx', 'xls', 'csv'].includes(ext)) iconKey = 'generate_spreadsheet';
  else if (ext === 'pdf') iconKey = 'generate_pdf';
  const Icon = TOOL_ICONS[iconKey] || File;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-left transition-colors duration-150 animate-fade-in-up"
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        padding: '8px 12px',
        width: '220px',
        height: '56px',
        cursor: 'pointer',
        border: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
      }}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <Icon size={16} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.56)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[13px] font-medium truncate leading-tight"
          style={{ color: 'rgba(255,255,255,0.84)' }}
        >
          {file.fileName}
        </p>
        <p
          className="text-[11px] leading-tight mt-0.5"
          style={{ color: 'rgba(255,255,255,0.40)' }}
        >
          Preview File
        </p>
      </div>
    </button>
  );
}

/* ── Task completed bar (Kimi-style sticky) ───────────────────── */
export function TaskCompletedCard({ duration }: { duration?: string }) {
  return (
    <div
      className="animate-slide-up"
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        padding: '0 4px',
      }}
    >
      <div
        className="flex items-center gap-2"
        style={{
          background: 'rgb(31, 31, 31)',
          borderRadius: '20px 20px 0 0',
          padding: '12px 16px',
          height: '50px',
          boxShadow: 'rgba(0,0,0,0.07) 0px 5px 16px -4px',
        }}
      >
        <CheckCircle2
          size={16}
          strokeWidth={2}
          style={{ color: 'rgb(52,199,89)' }}
          className="flex-shrink-0"
        />
        <span
          className="flex-1 text-[14px] font-medium"
          style={{ color: 'rgba(255,255,255,0.84)' }}
        >
          Task completed
        </span>
        {duration && (
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
            {duration}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Reaction bar below messages ──────────────────────────────── */
export function ReactionBar({ content }: { content: string }) {
  const [liked, setLiked] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const iconColor = 'rgba(255,255,255,0.32)';
  const activeColor = 'rgba(255,255,255,0.72)';

  return (
    <div className="flex items-center pt-1 animate-fade-in" style={{ gap: '6px', height: '28px', marginLeft: '48px' }}>
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md transition-colors duration-150 hover:bg-white/5"
        style={{ color: copied ? activeColor : iconColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
        title="Copy"
      >
        <Copy size={16} strokeWidth={1.5} />
      </button>
      <button
        onClick={() => setLiked(liked === 'up' ? null : 'up')}
        className="p-1.5 rounded-md transition-colors duration-150 hover:bg-white/5"
        style={{ color: liked === 'up' ? activeColor : iconColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
        title="Like"
      >
        <ThumbsUp size={16} strokeWidth={1.5} />
      </button>
      <button
        onClick={() => setLiked(liked === 'down' ? null : 'down')}
        className="p-1.5 rounded-md transition-colors duration-150 hover:bg-white/5"
        style={{ color: liked === 'down' ? activeColor : iconColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
        title="Dislike"
      >
        <ThumbsDown size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}
