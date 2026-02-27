'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUp, Plus, X, Zap, Bot, Users, Layers, ChevronUp, Check } from 'lucide-react';

export type ChatMode = 'auto' | 'openclaw' | 'council' | 'fullstack';

type ModeEntry = { type: 'mode'; id: ChatMode; label: string; shortLabel: string; description: string; icon: typeof Zap; accent: string };
type DividerEntry = { type: 'divider'; label: string };
type ModeItem = ModeEntry | DividerEntry;

const MODE_ITEMS: ModeItem[] = [
  { type: 'mode', id: 'auto', label: 'Hyprnova Flash', shortLabel: 'Flash', description: 'Fast · single call · no agent loop', icon: Zap, accent: 'rgb(96,165,250)' },
  { type: 'divider', label: '— Agent modes —' },
  { type: 'mode', id: 'openclaw', label: 'Hyprnova Think', shortLabel: 'Think', description: 'Single agent · memory · tools', icon: Bot, accent: 'rgb(167,139,250)' },
  { type: 'mode', id: 'council', label: 'Hyprnova Council', shortLabel: 'Council', description: '7 directors · peer review · synthesis', icon: Users, accent: 'rgb(52,211,153)' },
  { type: 'mode', id: 'fullstack', label: 'Hyprnova Agent', shortLabel: 'Agent', description: 'OpenClaw + Council + orchestration', icon: Layers, accent: 'rgb(251,191,36)' },
];

const MODES = MODE_ITEMS.filter((m): m is ModeEntry => m.type === 'mode');

interface MessageInputProps {
  onSend: (message: string, files: File[], mode: ChatMode) => void;
  disabled?: boolean;
  initialMode?: ChatMode;
}

const MAX_HEIGHT = 200;
const ACCEPTED_TYPES = '.csv,.xlsx,.xls,.pdf,.txt,.md,.docx,.pptx,.json';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageInput({ onSend, disabled = false, initialMode }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [mode, setMode] = useState<ChatMode>(initialMode ?? 'openclaw');
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!modeDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) {
        setModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [modeDropdownOpen]);

  const handleSend = () => {
    const trimmed = value.trim();
    if ((!trimmed && files.length === 0) || disabled) return;
    onSend(trimmed, files, mode);
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
  const currentMode = MODES.find((m) => m.id === mode)!;
  const ModeIcon = currentMode.icon;

  return (
    <div
      className="transition-all duration-200"
      style={{
        background: 'var(--chatbox-bg)',
        border: `1px solid ${isFocused ? 'var(--chatbox-border-focus)' : 'var(--chatbox-border)'}`,
        borderRadius: '24px',
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
        placeholder="Ask anything"
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

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Right: Mode pill + Send button */}
        <div className="flex items-center gap-2">
          {/* Mode selector chip */}
          <div ref={modeRef} className="relative">
            <button
              type="button"
              onClick={() => setModeDropdownOpen((prev) => !prev)}
              disabled={disabled}
              className="flex items-center gap-1 py-1.5 text-[13px] font-medium transition-all duration-150"
              style={{
                color: 'var(--text-secondary)',
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!disabled) e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {currentMode.shortLabel}
              <ChevronUp
                className="w-3.5 h-3.5 transition-transform duration-150"
                strokeWidth={2}
                style={{
                  color: 'var(--text-tertiary)',
                  transform: modeDropdownOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                }}
              />
            </button>

            {/* Dropdown — KIMI style, opens below */}
            {modeDropdownOpen && (
              <div
                className="absolute bottom-full mb-2 right-0 w-[280px] rounded-xl py-1.5 z-50"
                style={{
                  background: 'var(--dropdown-bg)',
                  boxShadow: 'var(--dropdown-shadow)',
                }}
              >
                {MODE_ITEMS.map((item, idx) => {
                  if (item.type === 'divider') {
                    return (
                      <div key={`divider-${idx}`} className="px-4 py-1">
                        <div style={{ height: '1px', background: 'var(--dropdown-divider)' }} />
                      </div>
                    );
                  }
                  const isSelected = item.id === mode;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMode(item.id);
                        setModeDropdownOpen(false);
                      }}
                      className="flex items-start gap-3 w-full px-4 py-2.5 text-left transition-colors duration-100"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--dropdown-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--dropdown-label)' }}>
                          {item.label}
                        </p>
                        <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--dropdown-desc)' }}>
                          {item.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check
                          className="w-4 h-4 flex-shrink-0 mt-0.5"
                          strokeWidth={2.5}
                          style={{ color: 'rgb(59,130,246)' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Send button */}
          {/* Send button — Kimi: 28×28, border-radius 22px, rgba bg */}
          <button
            onClick={handleSend}
            disabled={disabled || !hasContent}
            className="flex items-center justify-center flex-shrink-0 transition-all duration-150"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '22px',
              background: hasContent && !disabled ? 'var(--send-btn-bg)' : 'var(--surface-glass)',
              color: hasContent && !disabled ? 'var(--send-btn-icon)' : 'var(--text-tertiary)',
              cursor: disabled || !hasContent ? 'default' : 'pointer',
            }}
          >
            {disabled ? (
              <div
                className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{
                  borderColor: 'var(--send-btn-loading-border)',
                  borderTopColor: 'var(--send-btn-loading-top)',
                }}
              />
            ) : (
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
