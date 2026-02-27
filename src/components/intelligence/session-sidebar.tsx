'use client';

import { useState } from 'react';
import {
  ChevronDown,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { CouncilSSEState, DirectorState } from '@/hooks/useCouncilSSE';

/* ─── Director Colors ──────────────────────────────────── */

const DIRECTOR_COLORS: Record<string, string> = {
  chairman: '#60a5fa',
  cfo: '#34d399',
  cmo: '#f472b6',
  cto: '#a78bfa',
  coo: '#fbbf24',
  cso: '#fb923c',
  cro: '#38bdf8',
  secretary: '#94a3b8',
};

function getDirectorColor(slug: string): string {
  return DIRECTOR_COLORS[slug] ?? '#6b7280';
}

function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ─── Reusable Section Header ──────────────────────────── */

function SectionHeader({
  title,
  badge,
  open,
  onToggle,
}: {
  title: string;
  badge?: string | number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full px-4 py-2.5 text-left group"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
          {title}
        </span>
        {badge !== undefined && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <ChevronDown
        size={12}
        className={cn(
          'text-white/30 transition-transform duration-200',
          !open && '-rotate-90'
        )}
        strokeWidth={1.5}
      />
    </button>
  );
}

/* ─── Progress Row ─────────────────────────────────────── */

const FIXED_BOTTOM_STEPS = [
  { key: 'reviewing',    label: 'Peer Review' },
  { key: 'synthesizing', label: 'Synthesis' },
] as const;

function getFixedStatus(
  stepKey: 'reviewing' | 'synthesizing',
  stage: string
): 'complete' | 'active' | 'pending' {
  if (stage === 'completed') return 'complete';
  if (stage === 'failed') return 'pending';
  if (stepKey === 'reviewing') {
    if (['synthesizing', 'completed'].includes(stage)) return 'complete';
    if (stage === 'reviewing') return 'active';
    return 'pending';
  }
  if (stepKey === 'synthesizing') {
    if (stage === 'completed') return 'complete';
    if (stage === 'synthesizing') return 'active';
    return 'pending';
  }
  return 'pending';
}

function ProgressRow({
  label,
  status,
  indent = false,
}: {
  label: string;
  status: 'complete' | 'active' | 'pending';
  indent?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2.5 py-[3px]', indent && 'pl-4')}>
      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {status === 'complete' ? (
          <CheckCircle2 size={12} className="text-emerald-400" strokeWidth={1.5} />
        ) : status === 'active' ? (
          <Loader2 size={12} className="text-blue-400 animate-spin" strokeWidth={1.5} />
        ) : (
          <div className="w-[5px] h-[5px] rounded-full bg-white/15" />
        )}
      </div>
      <span className={cn(
        'text-[12px] truncate',
        status === 'complete' ? 'text-white/35' :
        status === 'active'   ? 'text-white/85' :
                                'text-white/25'
      )}>
        {label}
      </span>
      {status === 'active' && (
        <div className="ml-auto w-1 h-1 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
      )}
    </div>
  );
}

/* ─── Progress Section ─────────────────────────────────── */

function ProgressSection({ stage, directors }: { stage: string; directors: DirectorState[] }) {
  const [open, setOpen] = useState(true);

  const decomposingDone = !['pending', 'decomposing'].includes(stage);
  const decomposingActive = stage === 'decomposing';
  const completedCount =
    (decomposingDone ? 1 : 0) +
    directors.filter(d => d.status === 'completed').length +
    (['synthesizing', 'completed'].includes(stage) ? 1 : 0) +
    (stage === 'completed' ? 1 : 0);
  const totalCount = 1 + directors.length + 2;

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <SectionHeader
        title="Progress"
        open={open}
        onToggle={() => setOpen(o => !o)}
        badge={directors.length > 0 ? `${completedCount}/${totalCount}` : undefined}
      />
      {open && (
        <div className="px-4 pb-3">
          {/* Step 1 — always fixed */}
          <ProgressRow
            label="Decomposing goal"
            status={decomposingDone ? 'complete' : decomposingActive ? 'active' : 'pending'}
          />

          {/* While decomposing — show skeleton */}
          {stage === 'decomposing' && (
            <ProgressRow label="Building task plan..." status="active" indent />
          )}

          {/* Dynamic director tasks from plan_ready */}
          {directors.map((director) => (
            <ProgressRow
              key={director.slug}
              label={
                director.goal
                  ? `${director.slug.toUpperCase()} — ${director.goal.slice(0, 48)}${director.goal.length > 48 ? '…' : ''}`
                  : `${director.slug.toUpperCase()} — Analyzing...`
              }
              status={
                director.status === 'completed' ? 'complete' :
                director.status === 'running'   ? 'active'  : 'pending'
              }
              indent
            />
          ))}

          {/* Fixed bottom steps */}
          {FIXED_BOTTOM_STEPS.map((step) => (
            <ProgressRow
              key={step.key}
              label={step.label}
              status={getFixedStatus(step.key, stage)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Agents Section ───────────────────────────────────── */

function AgentsSection({
  directors,
}: {
  directors: CouncilSSEState['directors'];
}) {
  const [open, setOpen] = useState(true);

  const runningCount = directors.filter((d) => d.status === 'running').length;

  return (
    <div>
      <SectionHeader
        title="Agents"
        badge={runningCount > 0 ? `${runningCount} active` : directors.length || undefined}
        open={open}
        onToggle={() => setOpen(!open)}
      />
      {open && (
        <div className="px-4 py-2 space-y-1">
          {directors.length === 0 ? (
            <p className="text-[11px] text-white/25 py-2">
              Waiting for plan…
            </p>
          ) : (
            directors.map((director) => {
              const color = getDirectorColor(director.slug);
              const lastStep =
                director.steps.length > 0
                  ? director.steps[director.steps.length - 1]
                  : null;

              return (
                <div
                  key={director.slug}
                  className="flex items-center gap-2.5 py-1.5 rounded-md px-1.5 -mx-1.5"
                  style={{
                    background:
                      director.status === 'running'
                        ? 'rgba(255,255,255,0.03)'
                        : 'transparent',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${color}18`,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    <span
                      className="text-[9px] font-bold"
                      style={{ color }}
                    >
                      {getInitials(director.name)}
                    </span>
                  </div>

                  {/* Name + current tool */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-white/70 truncate leading-tight">
                      {director.name}
                    </p>
                    {lastStep && director.status === 'running' && (
                      <p className="text-[10px] text-white/30 truncate leading-tight">
                        {lastStep.name}
                      </p>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {director.status === 'completed' ? (
                      <CheckCircle2 size={11} className="text-emerald-400" strokeWidth={1.5} />
                    ) : director.status === 'running' ? (
                      <Loader2 size={11} className="text-blue-400 animate-spin" strokeWidth={1.5} />
                    ) : director.status === 'failed' ? (
                      <AlertCircle size={11} className="text-red-400" strokeWidth={1.5} />
                    ) : (
                      <div className="w-[5px] h-[5px] rounded-full bg-white/15" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Output Section ───────────────────────────────────── */

function OutputSection({ synthesis }: { synthesis: string }) {
  const [open, setOpen] = useState(true);

  const hasSynthesis = synthesis.length > 0;
  const excerpt = hasSynthesis ? synthesis.slice(0, 300) : '';

  return (
    <div>
      <SectionHeader
        title="Output"
        badge={hasSynthesis ? undefined : undefined}
        open={open}
        onToggle={() => setOpen(!open)}
      />
      {open && (
        <div className="px-4 py-2">
          {hasSynthesis ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-1">
                <FileText size={11} className="text-white/30" strokeWidth={1.5} />
                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                  Synthesis
                </span>
              </div>
              <p className="text-[12px] text-white/60 leading-relaxed">
                {excerpt}
                {synthesis.length > 300 && (
                  <span className="text-white/30">…</span>
                )}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-white/25 py-2">
              Waiting for synthesis…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main SessionSidebar ──────────────────────────────── */

export function SessionSidebar({
  sse,
  goal,
}: {
  sse: CouncilSSEState;
  goal: string;
}) {
  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        width: 320,
        flexShrink: 0,
        background: '#0f0f0f',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1">
          Session
        </p>
        <p className="text-[12px] text-white/70 leading-snug line-clamp-2">
          {goal || 'No active session'}
        </p>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        <ProgressSection stage={sse.stage} directors={sse.directors} />
        <AgentsSection directors={sse.directors} />
        <OutputSection synthesis={sse.synthesis} />
      </div>

      {/* Connection indicator */}
      <div
        className="px-4 py-2 flex items-center gap-2 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            sse.connected
              ? 'bg-green-400 animate-pulse'
              : sse.stage === 'completed'
                ? 'bg-white/20'
                : 'bg-red-400'
          )}
        />
        <span className="text-[10px] text-white/30">
          {sse.connected
            ? 'Connected'
            : sse.stage === 'completed'
              ? 'Done'
              : 'Disconnected'}
        </span>
      </div>
    </div>
  );
}
