'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { trpc } from '@/trpc/client';
import { cn } from '@/lib/utils/cn';
import { useCouncilSSE, formatDirectorName } from '@/hooks/useCouncilSSE';
import type { DirectorState } from '@/hooks/useCouncilSSE';

const STAGES = ['pending', 'decomposition', 'analysis', 'peer_review', 'synthesis', 'completed'] as const;
const STAGE_LABELS: Record<string, string> = {
  pending: 'Pending',
  decomposition: 'Decomposition',
  analysis: 'Analysis',
  peer_review: 'Peer Review',
  synthesis: 'Synthesis',
  completed: 'Complete',
  failed: 'Failed',
};

export default function CouncilSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sse = useCouncilSSE(sessionId);

  const { data: sessionData } = trpc.council.getSession.useQuery(
    { id: sessionId },
    { enabled: !!sessionId }
  );

  // Initialize from tRPC data (for completed sessions that won't get SSE events)
  // The SSE hook handles live events; tRPC provides initial/historical data
  const goal = (sessionData as Record<string, unknown>)?.goal as string ?? 'Board Session';

  // Merge: use SSE state for live data, fall back to tRPC for completed sessions
  const stage = sse.stage !== 'pending' ? sse.stage : ((sessionData as Record<string, unknown>)?.stage as string) ?? 'pending';
  const directors = sse.directors.length > 0
    ? sse.directors
    : buildDirectorsFromTRPC(sessionData);
  const exchanges = sse.exchanges.length > 0
    ? sse.exchanges
    : ((sessionData as Record<string, unknown>)?.exchanges as typeof sse.exchanges) ?? [];
  const synthesis = sse.synthesis || (((sessionData as Record<string, unknown>)?.chairman_summary as string) ?? '');

  const stageIndex = STAGES.indexOf(stage as typeof STAGES[number]);

  return (
    <div className="space-y-6 px-4 py-6 md:px-8 md:py-8">
      {/* Back link + heading */}
      <div>
        <Link
          href="/app/intelligence"
          className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/80 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Intelligence
        </Link>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          {goal}
        </h1>
        {sse.connected && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[12px] text-white/40">Live</span>
          </div>
        )}
      </div>

      {/* Phase progress bar */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-1">
          {STAGES.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'h-1.5 w-full rounded-full transition-all duration-500',
                    i <= stageIndex
                      ? stage === 'failed'
                        ? 'bg-red-400/60'
                        : 'bg-green-400/60'
                      : 'bg-white/[0.06]'
                  )}
                />
                <span className={cn(
                  'text-[10px] font-medium',
                  i <= stageIndex ? 'text-white/70' : 'text-white/25'
                )}>
                  {STAGE_LABELS[s]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Director cards grid */}
      {directors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {directors.map((director) => (
            <GlassCard key={director.slug} className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}
                >
                  {director.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[var(--text-primary)]">
                    {director.name}
                  </p>
                  <p className="text-[12px] text-white/40">{director.role}</p>
                </div>
                <StatusIndicator status={director.status} />
              </div>

              {/* Tool call steps */}
              {director.steps.length > 0 && (
                <div className="space-y-1 mb-3">
                  {director.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 h-[36px] px-2 rounded bg-white/[0.03]">
                      <span className="text-[11px] font-mono text-white/50 truncate">
                        {step.name}
                      </span>
                      {step.result && (
                        <span className="text-[11px] text-white/30 truncate ml-auto">
                          {step.result}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Output text */}
              {director.output && (
                <div className="text-[13px] leading-relaxed text-white/70 whitespace-pre-wrap">
                  {director.output}
                  {director.status === 'running' && (
                    <span className="inline-block w-1.5 h-4 ml-0.5 bg-white/50 animate-pulse" />
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* Peer review exchanges */}
      {exchanges.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[11px] font-medium tracking-widest uppercase text-white/40">
            Peer Review
          </h2>
          <div className="space-y-2">
            {exchanges.map((ex) => (
              <GlassCard key={ex.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] font-medium text-white/60">
                    {formatDirectorName(ex.from_director)}
                  </span>
                  <span className="text-[11px] text-white/30">{'\u2192'}</span>
                  <span className="text-[12px] font-medium text-white/60">
                    {formatDirectorName(ex.to_director)}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-white/70">{ex.content}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Synthesis */}
      {synthesis && (
        <div className="space-y-3">
          <h2 className="text-[11px] font-medium tracking-widest uppercase text-white/40">
            Synthesis
          </h2>
          <GlassCard className="p-5">
            <div className="text-[14px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
              {synthesis}
              {stage !== 'completed' && stage !== 'failed' && (
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-white/50 animate-pulse" />
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Error */}
      {sse.error && (
        <div
          className="rounded-xl p-4"
          style={{
            border: '1px solid rgba(248,113,113,0.2)',
            background: 'rgba(248,113,113,0.04)',
          }}
        >
          <p className="text-[13px] text-red-400">{sse.error}</p>
        </div>
      )}
    </div>
  );
}

function buildDirectorsFromTRPC(sessionData: unknown): DirectorState[] {
  if (!sessionData) return [];
  const s = sessionData as Record<string, unknown>;
  const tasks = (s.tasks as Record<string, unknown>[]) ?? [];
  if (tasks.length === 0) return [];
  return tasks.map((t) => ({
    slug: (t.director_slug as string) ?? '',
    name: formatDirectorName((t.director_slug as string) ?? ''),
    role: (t.director_slug as string) ?? '',
    goal: (t.goal as string) ?? '',
    status: t.status === 'completed' ? 'completed' as const : t.status === 'failed' ? 'failed' as const : 'idle' as const,
    steps: [],
    output: (t.result_data as Record<string, unknown>)?.text as string ?? '',
  }));
}

function StatusIndicator({ status }: { status: DirectorState['status'] }) {
  const config = {
    idle: { color: 'rgba(255,255,255,0.2)', label: 'Idle' },
    running: { color: 'rgba(251,191,36,0.8)', label: 'Running' },
    completed: { color: 'rgba(52,211,153,0.8)', label: 'Done' },
    failed: { color: 'rgba(248,113,113,0.8)', label: 'Failed' },
  };
  const c = config[status];
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn('w-2 h-2 rounded-full', status === 'running' && 'animate-pulse')}
        style={{ background: c.color }}
      />
      <span className="text-[11px] text-white/40">{c.label}</span>
    </div>
  );
}
