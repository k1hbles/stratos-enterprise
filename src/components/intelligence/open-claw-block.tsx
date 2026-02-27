'use client';

import { Check, Zap } from 'lucide-react';

interface OpenClawBlockProps {
  steps: string[];
  isReady: boolean;
}

/**
 * Compact OpenClaw init indicator.
 * Shows a small action block once initialization completes.
 */
export function OpenClawBlock({ steps: _steps, isReady }: OpenClawBlockProps) {
  if (!isReady) {
    // Still initializing — show minimal loading line
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
        style={{
          background: 'rgba(167,139,250,0.04)',
          border: '1px solid rgba(167,139,250,0.12)',
          color: 'rgba(167,139,250,0.7)',
        }}
      >
        <Zap className="w-3 h-3 animate-pulse" strokeWidth={2} />
        <span>Initializing OpenClaw...</span>
      </div>
    );
  }

  // Ready — compact single-line
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px]"
      style={{
        background: 'rgba(52,211,153,0.04)',
        border: '1px solid rgba(52,211,153,0.15)',
        color: 'rgba(52,211,153,0.7)',
      }}
    >
      <Check className="w-3 h-3" strokeWidth={2.5} />
      <span>OpenClaw initialized</span>
    </div>
  );
}
