'use client';

import { forwardRef, useState, useRef, useEffect, useCallback, TextareaHTMLAttributes } from 'react';
import { ArrowUp, X, Zap, Bot, Users, Layers, ChevronUp, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { PlusMenu } from '@/components/chat/plus-menu';
import type { ChatMode } from '@/components/chat/message-input';

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

interface GlassInputProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onSend'> {
  onSend?: (files: File[], mode: ChatMode) => void;
  animationStage?: number;
  isLoading?: boolean;
  activeMode?: { mode: string; label: string; icon: React.ElementType } | null;
  onClearMode?: () => void;
}

const MAX_HEIGHT = 200;

export const GlassInput = forwardRef<HTMLTextAreaElement, GlassInputProps>(
  ({ onSend, animationStage = 4, isLoading = false, activeMode, onClearMode, className = '', onChange, onFocus: _onFocus, onBlur: _onBlur, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [mode, setMode] = useState<ChatMode>('openclaw');
    const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const modeRef = useRef<HTMLDivElement>(null);

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      },
      [ref],
    );

    const autoResize = useCallback(() => {
      const textarea = internalRef.current;
      if (!textarea) return;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(scrollHeight, MAX_HEIGHT)}px`;
    }, []);

    useEffect(() => {
      autoResize();
    }, [props.value, autoResize]);

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

    const ACCEPTED_TYPES = '.csv,.xlsx,.xls,.pdf,.txt,.md,.docx,.pptx,.json';

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      if (selected.length > 0) setFiles(prev => [...prev, ...selected]);
      e.target.value = '';
    };

    const removeFile = (index: number) => {
      setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend?.(files, mode);
        setFiles([]);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      autoResize();
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      _onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      _onBlur?.(e);
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
        className={`flex flex-col w-full mx-auto ${className}`}
        style={{
          background: 'var(--chatbox-bg)',
          border: `1px solid ${isFocused ? 'var(--chatbox-border-focus)' : 'var(--chatbox-border)'}`,
          borderRadius: '24px',
          maxWidth: '798px',
          boxShadow: isFocused ? 'var(--chatbox-glow)' : 'var(--shadow-card)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        {/* File chips */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 pt-3 pb-0">
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
                {f.name.length > 25 ? f.name.slice(0, 22) + '...' : f.name}
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

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Textarea — starts as single line, grows on input */}
        <textarea
          ref={setRefs}
          rows={1}
          className="bg-transparent outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none resize-none w-full px-5 pt-4 pb-1"
          style={{
            fontSize: '16px',
            fontWeight: 400,
            letterSpacing: '-0.01em',
            color: 'var(--chatbox-text)',
            boxShadow: 'none',
            maxHeight: `${MAX_HEIGHT}px`,
            lineHeight: '1.5',
          }}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={isLoading}
          {...props}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          {/* Left side */}
          <PlusMenu onFileClick={() => fileInputRef.current?.click()} />

          {/* Active mode chip — left-aligned, bigger like KIMI */}
          {activeMode && (
            <div className="flex items-center gap-2 h-8 px-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-[13px] font-medium">
              <activeMode.icon size={15} className="text-blue-400" />
              <span className="text-blue-400/60">Agent</span>
              <span className="text-white/10 mx-0.5">|</span>
              <span className="text-white/90">{activeMode.label}</span>
              <button
                type="button"
                onClick={onClearMode}
                className="ml-0.5 text-white/30 hover:text-white/60 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Mode selector — hidden when activeMode is set */}
          {!activeMode && (
            <div ref={modeRef} className="relative">
              <button
                type="button"
                onClick={() => setModeDropdownOpen((prev) => !prev)}
                disabled={isLoading}
                className="flex items-center gap-1 py-1.5 text-[13px] font-medium transition-all duration-150"
                style={{
                  color: 'var(--text-secondary)',
                  opacity: isLoading ? 0.4 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                {MODES.find((m) => m.id === mode)!.shortLabel}
                <ChevronUp
                  className="w-3.5 h-3.5 transition-transform duration-150"
                  strokeWidth={2}
                  style={{ color: 'var(--text-tertiary)', transform: modeDropdownOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
                />
              </button>

              {modeDropdownOpen && (
                <div
                  className="absolute bottom-full mb-2 right-0 w-[280px] rounded-xl py-1.5 z-50"
                  style={{ background: '#2c2c2e', boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.2)' }}
                >
                  {MODE_ITEMS.map((item, idx) => {
                    if (item.type === 'divider') {
                      return (
                        <div key={`divider-${idx}`} className="px-4 py-1">
                          <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                        </div>
                      );
                    }
                    const isSelected = item.id === mode;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { setMode(item.id); setModeDropdownOpen(false); }}
                        className="flex items-start gap-3 w-full px-4 py-2.5 text-left transition-colors duration-100"
                        style={{ background: 'transparent' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold leading-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>{item.label}</p>
                          <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.description}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2.5} style={{ color: 'rgb(59,130,246)' }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Send button */}
          <button
            onClick={() => { onSend?.(files, mode); setFiles([]); }}
            type="button"
            disabled={isLoading}
            className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-150"
            style={{
              background: 'var(--send-btn-bg)',
              opacity: isLoading ? 0.6 : 1,
              color: 'var(--send-btn-icon)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.opacity = '0.9';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            {isLoading ? (
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
      </motion.div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

function ToolbarButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-150"
      style={{ color: 'var(--toolbar-icon)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--toolbar-hover-bg)';
        e.currentTarget.style.color = 'var(--toolbar-hover-icon)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--toolbar-icon)';
      }}
    >
      {children}
    </button>
  );
}
