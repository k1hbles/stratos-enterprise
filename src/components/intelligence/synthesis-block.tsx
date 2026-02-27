'use client';

interface SynthesisBlockProps {
  synthesis: string;
  stage: string;
}

export function SynthesisBlock({ synthesis, stage }: SynthesisBlockProps) {
  const isStreaming = stage === 'synthesis';
  const isComplete = stage === 'completed';

  if (!synthesis && !isStreaming) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
        >
          S
        </div>
        <span className="text-[13px] font-medium text-white/70">Synthesis</span>
        {isStreaming && (
          <span className="text-[11px] text-white/30 ml-auto">Secretary writing...</span>
        )}
        {isComplete && (
          <span className="text-[11px] text-emerald-400/60 ml-auto">Complete</span>
        )}
      </div>

      <div className="pl-8">
        {synthesis ? (
          <div className="text-[13px] leading-relaxed text-white/60 whitespace-pre-wrap">
            {synthesis}
            {isStreaming && (
              <span className="inline-block w-[2px] h-4 ml-0.5 bg-white/50 animate-pulse align-middle" />
            )}
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-2 text-[12px] text-white/30">
            <span className="inline-block w-[2px] h-4 bg-white/40 animate-pulse" />
            Generating synthesis...
          </div>
        ) : null}
      </div>
    </div>
  );
}
