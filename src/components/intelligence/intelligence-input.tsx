'use client';

import { useState, useRef, useCallback } from 'react';
import { ArrowUp, Plus, Layers } from 'lucide-react';

interface IntelligenceInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const MAX_HEIGHT = 200;

export function IntelligenceInput({ onSend, disabled = false }: IntelligenceInputProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
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

  const hasContent = value.trim().length > 0;

  return (
    <div
      className="transition-all duration-200"
      style={{
        background: 'var(--chatbox-bg)',
        border: `1px solid ${isFocused ? 'var(--chatbox-border-focus)' : 'var(--chatbox-border)'}`,
        borderRadius: '20px',
        boxShadow: isFocused ? 'var(--chatbox-glow)' : 'none',
      }}
    >
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
        placeholder="Follow up with your council..."
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

      <div className="flex items-center justify-between px-3 pb-3">
        {/* Left: Plus button (placeholder) */}
        <button
          type="button"
          disabled={disabled}
          className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-150"
          style={{
            color: 'var(--text-tertiary)',
            border: '1px solid var(--chatbox-border)',
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
        </button>

        <div className="flex items-center gap-2">
          {/* Static Full Stack badge */}
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium"
            style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.2)',
              color: 'rgb(251,191,36)',
            }}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400/70" strokeWidth={1.5} />
            <span className="text-amber-300/70">Agent</span>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || !hasContent}
            className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-150"
            style={{
              background: hasContent && !disabled ? 'white' : 'var(--surface-glass)',
              color: hasContent && !disabled ? 'black' : 'var(--text-tertiary)',
              cursor: disabled || !hasContent ? 'default' : 'pointer',
            }}
          >
            {disabled ? (
              <div
                className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderTopColor: 'rgba(255,255,255,0.4)',
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
