'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, FileSpreadsheet, File, FileImage, FileCode } from 'lucide-react';
import { Avatar } from '../ui/avatar';
import { cn } from '@/lib/utils/cn';

export interface FileAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  storagePath: string;
}

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  files?: FileAttachment[];
  isStreaming?: boolean;
  children?: React.ReactNode;
  hideAvatar?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['csv', 'xlsx', 'xls'].includes(ext)) return FileSpreadsheet;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return FileImage;
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'html', 'css'].includes(ext)) return FileCode;
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'pptx'].includes(ext)) return FileText;
  return File;
}

function getFileTypeLabel(fileName: string): string {
  const ext = fileName.split('.').pop()?.toUpperCase() ?? '';
  return ext || 'FILE';
}

function FileCard({ file }: { file: FileAttachment }) {
  const Icon = getFileIcon(file.fileName);
  const typeLabel = getFileTypeLabel(file.fileName);

  return (
    <a
      href={`/api/files/download?id=${file.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors duration-150 no-underline animate-fade-in-up"
      style={{
        background: 'var(--surface-glass)',
        border: '1px solid var(--surface-glass-border)',
        cursor: 'pointer',
        maxWidth: '280px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface-glass-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--surface-glass)';
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: 'var(--surface-glass-elevated)',
          border: '1px solid var(--surface-glass-elevated-border)',
        }}
      >
        <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[13px] font-medium truncate leading-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {file.fileName}
        </p>
        <p
          className="text-[11px] leading-tight mt-0.5"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {typeLabel} · {formatFileSize(file.fileSize)}
        </p>
      </div>
    </a>
  );
}

/**
 * Renders streaming text with a subtle fade-in on each newly arrived chunk.
 * Committed (already-shown) text renders instantly; only the incoming delta animates.
 */
function StreamingText({ content }: { content: string }) {
  const committedRef = useRef(0);

  const committed = content.slice(0, committedRef.current);
  const incoming  = content.slice(committedRef.current);

  // After React paints this frame, mark everything as committed
  useEffect(() => {
    committedRef.current = content.length;
  });

  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {committed}
      {incoming && (
        <span key={committedRef.current} className="animate-token-reveal">
          {incoming}
        </span>
      )}
    </span>
  );
}

export function MessageBubble({ role, content, files, isStreaming, children, hideAvatar }: MessageBubbleProps) {
  const isUser = role === 'user';
  const hasFiles = files && files.length > 0;
  const showContent = content.trim().length > 0 || isStreaming;

  return (
    <div className={cn(
      "flex w-full gap-4 animate-fade-in-up",
      isUser ? 'justify-end' : 'justify-start'
    )}>
      {!isUser && !hideAvatar && (
        <Avatar
          name="AI"
          src="/intelligence-mascot.png"
          size="sm"
          className="mt-1 border-none bg-transparent"
        />
      )}
      {!isUser && hideAvatar && (
        <div className="w-8 flex-shrink-0 mt-1" />
      )}
      <div className={cn(
        isUser ? "max-w-[75%]" : "max-w-[85%]",
        "flex flex-col",
        isUser ? "items-end" : "items-start",
        hasFiles ? 'space-y-2' : ''
      )}>
        {hasFiles && (
          <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        )}
        {showContent && (
          <div
            className={cn(
              isUser ? 'whitespace-pre-wrap' : 'markdown-content w-full min-h-[26px]'
            )}
            style={{
              fontSize: '16px',
              lineHeight: '26px',
              ...(isUser
                ? {
                    background: 'var(--user-bubble-bg)',
                    color: 'var(--user-bubble-text)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                  }
                : {
                    color: 'var(--text-primary)',
                    paddingTop: '6px',
                  }),
            }}
          >
            {isUser ? (
              content
            ) : (
              <div className="relative">
                {isStreaming ? (
                  <>
                    {content.trim() ? <StreamingText content={content} /> : null}
                    <span
                      className="inline-block w-1.5 h-5 ml-1 bg-[var(--text-primary)] animate-cursor-blink"
                      style={{ verticalAlign: 'middle', display: content.trim() ? 'inline-block' : 'block' }}
                    />
                  </>
                ) : (
                  content.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  ) : null
                )}
              </div>
            )}
          </div>
        )}
        {!isUser && children && (
          <div className="w-full">{children}</div>
        )}
      </div>
    </div>
  );
}
