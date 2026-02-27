"use client";

import type { ReactElement } from "react";

interface Suggestion {
  label: string;
  emoji: string;
}

const SUGGESTIONS: Suggestion[] = [
  { label: "Summarize my emails", emoji: "\u{1F4EC}" },
  { label: "Create a pitch deck", emoji: "\u{1F4CA}" },
  { label: "Prep meetings", emoji: "\u{1F4C5}" },
  { label: "Track my spending", emoji: "\u{1F4B0}" },
  { label: "Research internships", emoji: "\u{1F50D}" },
  { label: "Draft follow-up", emoji: "\u{270F}\u{FE0F}" },
];

interface SuggestionPillProps {
  readonly onSelect: (value: string) => void;
}

export function SuggestionPills({ onSelect }: SuggestionPillProps): ReactElement {
  return (
    <div className="flex max-w-[640px] flex-wrap items-center justify-center gap-[var(--space-2)]">
      {SUGGESTIONS.map(({ label, emoji }) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(label)}
          className="inline-flex items-center gap-2 rounded-[14px] border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] px-4 py-[var(--space-2)] text-[13px] text-[var(--text-secondary)] backdrop-blur-[16px] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:bg-[var(--surface-glass-hover)] hover:text-[var(--text-primary)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <span aria-hidden>{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
