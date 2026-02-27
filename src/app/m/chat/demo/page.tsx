'use client';

import React, { useState } from 'react';
import {
  Menu,
  PlusCircle,
  ChevronRight,
  Maximize2,
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
    <div className="flex items-center justify-between p-2.5 hover:bg-[#27272a]/50 rounded-xl cursor-pointer relative">
      <div className="flex items-center gap-3">
        <div className="w-6 flex justify-center text-gray-400 relative">
          {icon && icon}
          {dot && <div className="w-1.5 h-1.5 bg-gray-500 rounded-full z-10" />}
          {!isLast && (
            <div className="absolute top-6 bottom-[-10px] left-1/2 -translate-x-1/2 w-[1px] bg-[#27272a]" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[15px] text-gray-300">{title}</span>
          {subtitle && (
            <>
              <span className="text-gray-600">|</span>
              <span className="text-[15px] text-gray-500 truncate max-w-[100px]">{subtitle}</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-600" />
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
    <div className={`flex border-b border-[#27272a] last:border-0 ${isHeader ? 'bg-[#18181a]' : 'bg-[#121212]'}`}>
      <div className="w-1/3 p-3.5 text-[15px] text-gray-300 border-r border-[#27272a]">{col1}</div>
      <div className="w-2/3 p-3.5 text-[15px] text-gray-300">{col2}</div>
    </div>
  );
}

function FileCard({ file }: { file: TaskFile }) {
  const Icon = getFileIcon(file.fileName);
  return (
    <div className="bg-[#18181a] border border-[#27272a] rounded-2xl p-3.5 flex items-center gap-3.5">
      <div className="bg-[#27272a] p-2.5 rounded-xl text-gray-300">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-[15px] font-medium text-gray-200 truncate">{file.fileName}</span>
        <span className="text-[13px] text-gray-500 mt-0.5">{formatFileSize(file.fileSize)}</span>
      </div>
    </div>
  );
}

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
              <button className="text-gray-400 hover:text-white">
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
    <div className="text-[16px] text-gray-200 leading-relaxed flex flex-col gap-4">
      {elements}
    </div>
  );
}

function StepsGroup({ steps }: { steps: StepData[] }) {
  return (
    <div className="bg-[#18181a] border border-[#27272a] rounded-2xl p-1.5 flex flex-col relative">
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
        <div className="absolute -right-2 -bottom-4 w-10 h-10 bg-[#27272a] rounded-full flex items-center justify-center border border-[#3f3f46] shadow-lg z-10">
          <ArrowDown size={20} className="text-gray-300" />
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
      <div className="flex items-center justify-between px-4 py-3 z-10 bg-[#0f0f0f]">
        <div className="flex items-center gap-4">
          <button className="text-gray-300 hover:text-white">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">Stratos</span>
            <span className="text-sm text-gray-500 flex items-center gap-1">
              Agent <ChevronRight size={14} />
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-300">
          <button><PlusCircle size={22} /></button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
        <div className="px-4 pt-2 flex flex-col gap-6 pb-10">

          {/* Sticky Task Completed Banner */}
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

          {/* Render all mock messages */}
          {MOCK_MESSAGES.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="bg-[#27272a] text-gray-200 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] text-[16px] leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <React.Fragment key={msg.id}>
                {/* Tool call indicator */}
                {msg.toolIndicator && (
                  <div className="bg-[#18181a] border border-[#27272a] rounded-xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-gray-300">
                      <Lightbulb size={18} className="text-gray-400" />
                      <span className="text-[15px]">{msg.toolIndicator}</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-500" />
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
                  </div>
                )}

                {/* Action Buttons */}
                {msg.content || msg.blocks.some((b) => b.type === 'text') ? (
                  <div className="flex items-center gap-6 mt-2 text-gray-400">
                    <button className="hover:text-white"><VolumeX size={20} /></button>
                    <button className="hover:text-white"><ThumbsUp size={20} /></button>
                    <button className="hover:text-white"><ThumbsDown size={20} /></button>
                    <div className="flex-1" />
                    <button className="hover:text-white"><Share size={20} /></button>
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Bottom Input Area */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-[#0f0f0f] pt-2 px-4 flex flex-col gap-3 z-20"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}
      >
        <div className="flex items-center gap-3 bg-[#18181a] rounded-xl px-2 py-1.5 border border-[#27272a]">
          <div className="w-2" />
          <input
            type="text"
            placeholder="Enter your request..."
            className="flex-1 bg-transparent text-white outline-none placeholder-gray-500 text-[15px]"
          />
          <button className="p-1.5 text-gray-400 hover:text-white">
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
