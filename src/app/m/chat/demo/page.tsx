'use client';

import React, { useState } from 'react';
import {
  PlusCircle,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Share,
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
  VolumeX,
  ArrowDown,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */

interface StepData {
  toolId: string;
  toolName: string;
  status: 'running' | 'completed';
  summary?: string;
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
  toolIndicator?: string;
  taskComplete?: boolean;
  taskDuration?: string;
  file?: TaskFile;
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

/* ─── Sub-components ─────────────────────────────────────── */

function StepItem({
  icon,
  dot,
  title,
  subtitle,
  isLast,
}: {
  icon?: React.ReactNode;
  dot?: boolean;
  title: string;
  subtitle?: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 hover:bg-[var(--sidebar-item-hover)] rounded-xl cursor-pointer relative">
      <div className="flex items-center gap-3">
        <div className="w-6 flex justify-center text-[var(--text-subtle)] relative">
          {icon && icon}
          {dot && <div className="w-1.5 h-1.5 bg-[var(--text-placeholder)] rounded-full z-10" />}
          {!isLast && (
            <div className="absolute top-6 bottom-[-10px] left-1/2 -translate-x-1/2 w-[1px] bg-[var(--border-strong)]" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[15px] text-[var(--text-primary)]">{title}</span>
          {subtitle && (
            <>
              <span className="text-[var(--text-placeholder)]">|</span>
              <span className="text-[15px] text-[var(--text-placeholder)] truncate max-w-[100px]">{subtitle}</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight size={18} className="text-[var(--text-placeholder)]" />
    </div>
  );
}

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
    <div className={`flex border-b border-[var(--border-strong)] last:border-0 ${isHeader ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--content-card-bg)]'}`}>
      <div className="w-1/3 p-3.5 text-[15px] text-[var(--text-primary)] border-r border-[var(--border-strong)]">{col1}</div>
      <div className="w-2/3 p-3.5 text-[15px] text-[var(--text-primary)]">{col2}</div>
    </div>
  );
}

function FileCard({ file }: { file: TaskFile }) {
  const Icon = getFileIcon(file.fileName);
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-2xl p-3.5 flex items-center gap-3.5">
      <div className="bg-[var(--bg-elevated)] p-2.5 rounded-xl text-[var(--text-secondary)]">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-[15px] font-medium text-[var(--text-primary)] truncate">{file.fileName}</span>
        <span className="text-[13px] text-[var(--text-placeholder)] mt-0.5">{formatFileSize(file.fileSize)}</span>
      </div>
    </div>
  );
}

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
              <button className="text-[var(--text-subtle)] hover:text-[var(--text-primary)]">
                <Download size={20} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
      <div key={key++} className="border border-[var(--border-strong)] rounded-2xl overflow-hidden bg-[var(--bg-secondary)] mt-2 relative">
        <div className="flex items-center justify-between p-3.5 border-b border-[var(--border-strong)] bg-[var(--bg-secondary)]">
          <span className="font-medium text-[15px] text-[var(--text-primary)]">Table</span>
          <div className="flex items-center gap-4 text-[var(--text-subtle)]">
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

    if (!trimmed) { flushList(); flushTable(); continue; }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (/^\|[\s-:|]+\|$/.test(trimmed)) continue;
      flushList();
      const cells = trimmed.split('|').filter(Boolean).map((c) => c.trim());
      tableRows.push(cells);
      continue;
    }

    flushTable();

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) { currentList.push(bulletMatch[1]); continue; }

    flushList();

    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      elements.push(<div key={key++} className="font-medium mt-2">{renderInline(headingMatch[1])}</div>);
      continue;
    }

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
    <div className="text-[16px] text-[var(--text-primary)] leading-relaxed flex flex-col gap-4">
      {elements}
    </div>
  );
}

function StepsGroup({ steps }: { steps: StepData[] }) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-2xl p-1.5 flex flex-col relative">
      {steps.map((step, i) => {
        const Icon = getStepIcon(step.toolName);
        const isLast = i === steps.length - 1;
        return (
          <StepItem
            key={step.toolId}
            icon={step.status === 'running' && isLast ? undefined : <Icon size={16} />}
            dot={step.status === 'running' && isLast}
            title={formatToolLabel(step.toolName)}
            subtitle={step.summary ? step.summary.slice(0, 25) + (step.summary.length > 25 ? '...' : '') : undefined}
            isLast={isLast}
          />
        );
      })}
      {steps.length > 5 && (
        <div className="absolute -right-2 -bottom-4 w-10 h-10 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center border border-[var(--border-strong)] shadow-lg z-10">
          <ArrowDown size={20} className="text-[var(--text-secondary)]" />
        </div>
      )}
    </div>
  );
}

/* ─── Mock Data ──────────────────────────────────────────── */

const MOCK_FILES: TaskFile[] = [
  { fileName: 'Revenue_Analysis_Q4.xlsx', downloadUrl: '#', fileSize: 245000 },
  { fileName: 'Market_Report_2024.pdf', downloadUrl: '#', fileSize: 1820000 },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Analyze the top 10 revenue companies and create a spreadsheet',
    blocks: [],
  },
  {
    id: '2',
    role: 'assistant',
    content: '',
    toolIndicator: 'Analyzing Revenue Data',
    taskComplete: true,
    taskDuration: '12.4s',
    file: MOCK_FILES[0],
    blocks: [
      {
        type: 'steps',
        steps: [
          { toolId: 's1', toolName: 'search_web', status: 'completed', summary: 'Revenue data 2024' },
          { toolId: 's2', toolName: 'read_document', status: 'completed', summary: 'Fortune 500 list' },
          { toolId: 's3', toolName: 'run_analysis', status: 'completed', summary: 'Top 10 ranked' },
          { toolId: 's4', toolName: 'create_spreadsheet', status: 'completed', summary: 'Revenue_Analysis.xlsx' },
        ],
      },
      {
        type: 'text',
        text: `Here's the analysis of the top 10 revenue companies:

**Key Findings:**

- **Walmart** leads with $648B in annual revenue, maintaining its position as the world's largest company by revenue
- **Amazon** follows at $574B, driven by AWS cloud services and e-commerce growth
- **Apple** generated $394B with strong iPhone and Services performance
- **UnitedHealth Group** reached $372B through insurance and Optum health services
- **Berkshire Hathaway** rounded out the top 5 at $364B

Revenue Breakdown:

| Company | Revenue | Growth |
|---------|---------|--------|
| Walmart | $648B | +6.0% |
| Amazon | $574B | +11.8% |
| Apple | $394B | +2.1% |
| UnitedHealth | $372B | +14.6% |
| Berkshire | $364B | +20.7% |`,
      },
    ],
  },
  {
    id: '3',
    role: 'user',
    content: 'Can you also create a market report PDF?',
    blocks: [],
  },
  {
    id: '4',
    role: 'assistant',
    content: '',
    toolIndicator: 'Generating Market Report',
    taskComplete: true,
    taskDuration: '8.2s',
    file: MOCK_FILES[1],
    blocks: [
      {
        type: 'steps',
        steps: [
          { toolId: 's5', toolName: 'fetch_market_data', status: 'completed', summary: 'S&P 500 data' },
          { toolId: 's6', toolName: 'generate_presentation', status: 'completed', summary: 'Market_Report.pdf' },
        ],
      },
      {
        type: 'text',
        text: `The market report has been generated successfully.

**Report Highlights:**

- Overall market cap grew **12.3%** year-over-year
- Technology sector dominated with **34%** of total revenue share
- Healthcare sector showed strongest growth at **+14.6%** average
- Energy sector recovered with **+8.2%** after previous year decline

The report includes detailed charts, sector breakdowns, and year-over-year comparisons. You can download it using the file card below.`,
      },
    ],
  },
];

/* ─── Demo Page ──────────────────────────────────────────── */

export default function MobileChatDemoPage() {
  const [showFiles, setShowFiles] = useState(false);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 z-10 bg-[var(--bg-page)]">
        <div className="flex items-center gap-4">
          <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="3" y1="15" x2="14" y2="15" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">ELK</span>
            <span className="text-sm text-[var(--text-placeholder)] flex items-center gap-1">
              Agent <ChevronRight size={14} />
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[var(--text-secondary)]">
          <button><PlusCircle size={22} /></button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
        <div className="px-4 pt-2 flex flex-col gap-6 pb-10">

          {/* Render all mock messages */}
          {MOCK_MESSAGES.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="bg-[var(--user-bubble-bg)] text-[var(--user-bubble-text)] rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] text-[16px] leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <React.Fragment key={msg.id}>
                {/* Tool call indicator */}
                {msg.toolIndicator && (
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[var(--text-primary)]">
                      <Lightbulb size={18} className="text-[var(--text-subtle)]" />
                      <span className="text-[15px]">{msg.toolIndicator}</span>
                    </div>
                    <ChevronRight size={18} className="text-[var(--text-placeholder)]" />
                  </div>
                )}

                {/* Blocks: text and step groups */}
                {msg.blocks.map((block, bi) => {
                  if (block.type === 'text') {
                    return <AssistantContent key={bi} text={block.text} />;
                  }
                  if (block.type === 'steps') {
                    return <StepsGroup key={bi} steps={block.steps} />;
                  }
                  return null;
                })}

                {/* File Cards */}
                {msg.file && (
                  <div className="flex flex-col gap-3 mt-1">
                    <FileCard file={msg.file} />
                    <button
                      onClick={() => setShowFiles(true)}
                      className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-2xl p-3.5 flex items-center gap-3.5 text-left"
                    >
                      <div className="bg-[var(--bg-elevated)] p-2.5 rounded-xl text-[var(--text-secondary)]">
                        <Folder size={24} strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-medium text-[var(--text-primary)]">All files</span>
                        <span className="text-[13px] text-[var(--text-placeholder)] mt-0.5">Preview and download files</span>
                      </div>
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                {msg.content || msg.blocks.some((b) => b.type === 'text') ? (
                  <div className="flex items-center gap-6 mt-2 text-[var(--text-subtle)]">
                    <button className="hover:text-[var(--text-primary)]"><VolumeX size={20} /></button>
                    <button className="hover:text-[var(--text-primary)]"><ThumbsUp size={20} /></button>
                    <button className="hover:text-[var(--text-primary)]"><ThumbsDown size={20} /></button>
                    <div className="flex-1" />
                    <button className="hover:text-[var(--text-primary)]"><Share size={20} /></button>
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Bottom Input Area */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-[var(--bg-page)] pt-2 px-4 flex flex-col gap-3 z-20"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}
      >
        <div className="flex items-center gap-3 bg-[var(--bg-secondary)] rounded-xl px-2 py-1.5 border border-[var(--border-strong)]">
          <div className="w-2" />
          <input
            type="text"
            placeholder="Enter your request..."
            className="flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder-[var(--text-placeholder)] text-[15px]"
          />
          <button className="p-1.5 text-[var(--text-subtle)] hover:text-[var(--text-primary)]">
            <PlusCircle size={22} />
          </button>
        </div>
      </div>

      {/* Files overlay */}
      {showFiles && (
        <FilesOverlay files={MOCK_FILES} onClose={() => setShowFiles(false)} />
      )}
    </>
  );
}
