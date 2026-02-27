'use client';

import type { DirectorState } from '@/hooks/useCouncilSSE';
import { formatDirectorName } from '@/hooks/useCouncilSSE';
import { cn } from '@/lib/utils/cn';

const PHASES = [
  { key: 'decomposition', label: 'Decomposition' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'peer_review', label: 'Peer Review' },
  { key: 'synthesis', label: 'Synthesis' },
] as const;

const PHASE_ORDER = PHASES.map((p) => p.key);

interface CouncilBlockProps {
  stage: string;
  directors: DirectorState[];
}

export function CouncilBlock({ stage, directors }: CouncilBlockProps) {
  const currentPhaseIndex = PHASE_ORDER.indexOf(stage as typeof PHASE_ORDER[number]);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      {/* Phase progress bar */}
      <div className="flex items-center gap-1 mb-4">
        {PHASES.map((phase, i) => {
          const isActive = phase.key === stage;
          const isPast = currentPhaseIndex >= 0 && i < currentPhaseIndex;
          const isCompleted = stage === 'completed';
          const isFailed = stage === 'failed';
          return (
            <div key={phase.key} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  'h-1 w-full rounded-full transition-all duration-500',
                  isCompleted
                    ? 'bg-emerald-400/60'
                    : isFailed
                    ? 'bg-red-400/60'
                    : isPast
                    ? 'bg-blue-400/50'
                    : isActive
                    ? 'bg-blue-400/70'
                    : 'bg-white/[0.06]'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isActive || isPast || isCompleted ? 'text-white/60' : 'text-white/25'
                )}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Director mini-card grid */}
      {directors.length > 0 && (
        <div className="grid grid-cols-3 xl:grid-cols-4 gap-2">
          {directors.map((director) => (
            <DirectorMiniCard key={director.slug} director={director} />
          ))}
        </div>
      )}
    </div>
  );
}

function DirectorMiniCard({ director }: { director: DirectorState }) {
  const initials = formatDirectorName(director.slug)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const lastStep = director.steps.length > 0 ? director.steps[director.steps.length - 1] : null;
  const outputPreview = director.output ? director.output.slice(0, 80) : '';

  const borderStyle =
    director.status === 'completed'
      ? '1px solid rgba(52,211,153,0.3)'
      : director.status === 'running'
      ? '1px solid rgba(255,255,255,0.1)'
      : director.status === 'failed'
      ? '1px solid rgba(248,113,113,0.3)'
      : '1px solid rgba(255,255,255,0.05)';

  const bgStyle =
    director.status === 'completed'
      ? 'rgba(52,211,153,0.04)'
      : 'transparent';

  return (
    <div
      className={cn(
        'rounded-lg p-2.5 transition-all duration-300',
        director.status === 'running' && 'animate-pulse'
      )}
      style={{ border: borderStyle, background: bgStyle }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
        >
          {initials}
        </div>
        <span className="text-[11px] font-medium text-white/70 truncate flex-1">
          {formatDirectorName(director.slug)}
        </span>
        <StatusDot status={director.status} />
      </div>

      {lastStep && (
        <p className="text-[10px] font-mono text-white/35 truncate">
          {lastStep.name}
        </p>
      )}

      {outputPreview && !lastStep && (
        <p className="text-[10px] text-white/30 truncate">
          {outputPreview}
        </p>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: DirectorState['status'] }) {
  const color =
    status === 'completed'
      ? 'rgb(52,211,153)'
      : status === 'running'
      ? 'rgb(96,165,250)'
      : status === 'failed'
      ? 'rgb(248,113,113)'
      : 'rgba(255,255,255,0.2)';

  return (
    <div
      className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', status === 'running' && 'animate-pulse')}
      style={{ background: color }}
    />
  );
}
