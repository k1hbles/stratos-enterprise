'use client';

import { useState, useRef, useCallback } from 'react';
import { ArrowUp, Plus, X, Square } from 'lucide-react';

export type ChatMode = 'auto' | 'openclaw' | 'council' | 'fullstack';

interface MessageInputProps {
  onSend: (message: string, files: File[]) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
}

const MAX_HEIGHT = 200;
const ACCEPTED_TYPES = '.csv,.xlsx,.xls,.pdf,.txt,.md,.docx,.pptx,.json';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageInput({ onSend, disabled = false, isStreaming = false, onStop }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if ((!trimmed && files.length === 0) || disabled) return;
    onSend(trimmed, files);
    setValue('');
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) {
      setFiles((prev) => [...prev, ...selected]);
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const hasContent = value.trim().length > 0 || files.length > 0;

  return (
    <div
      className="transition-all duration-200"
      style={{
        background: 'var(--chatbox-bg)',
        border: `1px solid ${isFocused ? 'var(--chatbox-border-focus)' : 'var(--chatbox-border)'}`,
        borderRadius: '16px',
        boxShadow: isFocused ? 'var(--chatbox-glow)' : 'none',
      }}
    >
      {/* File chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-0">
          {files.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]"
              style={{
                background: 'var(--surface-glass)',
                border: '1px solid var(--surface-glass-border)',
                color: 'var(--text-secondary)',
              }}
            >
              {f.name.length > 20 ? f.name.slice(0, 17) + '...' : f.name}
              <span style={{ color: 'var(--text-tertiary)' }}>
                {formatFileSize(f.size)}
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="ml-0.5 rounded-full p-0.5 transition-colors duration-150"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--surface-glass-border)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X className="w-3 h-3" strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Textarea — full width, top section */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Ask ELK anything..."
        rows={1}
        disabled={disabled}
        className="w-full bg-transparent outline-none border-none ring-0 resize-none px-5 pt-4 pb-2 text-[15px]"
        style={{
          color: 'var(--chatbox-text)',
          maxHeight: `${MAX_HEIGHT}px`,
          lineHeight: '1.5',
          boxShadow: 'none',
        }}
      />

      {/* Bottom toolbar — buttons row */}
      <div className="flex items-center justify-between px-3 pb-3">
        {/* Left: Plus button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-150"
            style={{
              color: 'var(--text-tertiary)',
              border: '1px solid var(--chatbox-border)',
              opacity: disabled ? 0.4 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'var(--surface-glass)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Right: Send/Stop button */}
        <div className="flex items-center">
          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex items-center justify-center flex-shrink-0 transition-all duration-150"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '22px',
                background: 'var(--send-btn-bg)',
                color: 'var(--send-btn-icon)',
                cursor: 'pointer',
              }}
            >
              <Square className="w-3 h-3" fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!hasContent}
              className="flex items-center justify-center flex-shrink-0 transition-all duration-150"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '22px',
                background: hasContent ? 'var(--send-btn-bg)' : 'var(--surface-glass)',
                color: hasContent ? 'var(--send-btn-icon)' : 'var(--text-tertiary)',
                cursor: !hasContent ? 'default' : 'pointer',
              }}
            >
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
