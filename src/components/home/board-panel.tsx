'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { trpc } from '@/trpc/client';

const AVATAR_SIZE = 40;

const DIRECTORS = [
  { id: 'ch',  abbr: 'CH',  role: 'Chairman',   color: '#8b5cf6' },
  { id: 'cfo', abbr: 'CFO', role: 'Finance',     color: '#3b82f6' },
  { id: 'cmo', abbr: 'CMO', role: 'Marketing',   color: '#ec4899' },
  { id: 'cto', abbr: 'CTO', role: 'Technology',  color: '#10b981' },
  { id: 'coo', abbr: 'COO', role: 'Operations',  color: '#f59e0b' },
  { id: 'cso', abbr: 'CSO', role: 'Strategy',    color: '#6366f1' },
  { id: 'cro', abbr: 'CRO', role: 'Risk',        color: '#ef4444' },
  { id: 'sec', abbr: 'SEC', role: 'Secretary',   color: '#14b8a6' },
] as const;

type DirectorId = typeof DIRECTORS[number]['id'];

function getActiveDirectors(taskType?: string): DirectorId[] {
  switch (taskType) {
    case 'analysis': case 'profitability': case 'financial':
      return ['ch', 'cfo', 'cto'];
    case 'competitive': case 'market_entry': case 'market_sizing':
      return ['ch', 'cso', 'cmo'];
    case 'research':
      return ['ch', 'cto', 'cso'];
    case 'trends': case 'persona':
      return ['ch', 'cmo', 'cro'];
    case 'risk':
      return ['ch', 'cro', 'cfo'];
    case 'gtm':
      return ['ch', 'cmo', 'cso'];
    default:
      return ['ch', 'cfo', 'cto'];
  }
}

function getSubtasks(status: string) {
  const steps = [
    'Decomposing mission',
    'Searching live sources',
    'Running analysis model',
    'Synthesising findings',
  ];
  if (status === 'completed') return steps.map(l => ({ label: l, state: 'done' as const }));
  if (status === 'queued')    return steps.map(l => ({ label: l, state: 'pending' as const }));
  return [
    { label: steps[0], state: 'done' as const },
    { label: steps[1], state: 'done' as const },
    { label: steps[2], state: 'running' as const },
    { label: steps[3], state: 'pending' as const },
  ];
}

interface BoardPanelProps { animateIn?: boolean }

export function BoardPanel({ animateIn = true }: BoardPanelProps) {
  const { data: jobs } = trpc.jobs.list.useQuery({ limit: 20 }, { refetchInterval: 3000 });

  const activeJobs = useMemo(() =>
    (jobs ?? []).filter((j: { status: string }) => j.status === 'running' || j.status === 'queued'),
    [jobs]
  );

  const inSession  = activeJobs.length > 0;
  const mission    = activeJobs[0] as { id: string; title: string | null; status: string; task_type?: string } | undefined;
  const activeIds  = useMemo(() => getActiveDirectors(mission?.task_type), [mission]);
  const subtasks   = useMemo(() => mission ? getSubtasks(mission.status) : [], [mission]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={animateIn ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      {/* ── Session pill ─────────────────────────────────── */}
      <AnimatePresence>
        {inSession && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center mb-3"
          >
            <Link
              href="/app/intelligence"
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200"
              style={{
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.28)',
                color: '#c4b5fd',
                backdropFilter: 'blur(12px)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.12)'; }}
            >
              <motion.span
                animate={{ opacity: [1, 0.25, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                style={{ color: '#a78bfa', fontSize: 10 }}
              >●</motion.span>
              Board in Session
              <span style={{ color: 'rgba(196,181,253,0.5)' }}>·</span>
              {activeJobs.length} {activeJobs.length === 1 ? 'task' : 'tasks'}
              <span style={{ color: 'rgba(196,181,253,0.45)', fontSize: 11 }}>→</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main card ────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--task-card-bg)',
          borderTop:   '1px solid var(--task-card-border)',
          borderLeft:  '1px solid var(--task-card-border)',
          borderRight: '1px solid var(--task-card-border)',
          borderRadius: '20px 20px 0 0',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          overflow: 'hidden',
        }}
      >
        {/* ── Director strip ─────────────────────────────── */}
        <div className="px-5 pt-4 pb-4">
          <div className="flex items-center justify-between">
            {DIRECTORS.map((d, i) => {
              const active = inSession && activeIds.includes(d.id);

              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  {/* Circle avatar */}
                  <div className="relative">
                    <div
                      className="rounded-full flex items-center justify-center transition-all duration-300"
                      style={{
                        width: AVATAR_SIZE,
                        height: AVATAR_SIZE,
                        background: active ? `${d.color}22` : 'var(--nav-hover-bg, rgba(128,128,128,0.1))',
                        border: `2px solid ${active ? d.color + '70' : 'var(--border-default, rgba(128,128,128,0.2))'}`,
                        opacity: inSession && !active ? 0.35 : 1,
                      }}
                    >
                      <span style={{
                        fontFamily: 'var(--font-jetbrains-mono), monospace',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        color: active ? d.color : 'var(--text-secondary, rgba(128,128,128,0.8))',
                        transition: 'color 0.3s',
                      }}>
                        {d.abbr}
                      </span>
                    </div>

                    {/* Pulse dot */}
                    {active && (
                      <div className="absolute -bottom-0.5 -right-0.5 z-10">
                        <motion.div
                          animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-full"
                          style={{ background: d.color }}
                        />
                        <div className="w-2.5 h-2.5 rounded-full relative"
                          style={{ background: d.color, border: '2px solid var(--bg-page, #fff)' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Abbr label */}
                  <span style={{
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    color: active ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.2)',
                    transition: 'color 0.3s',
                  }}>
                    {d.abbr}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────── */}
        <div className="mx-4" style={{ height: 1, background: 'var(--task-card-border)' }} />

        {/* ── Active mission timeline ───────────────────── */}
        <AnimatePresence>
          {inSession && mission ? (
            <motion.div
              key="mission"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="px-5 py-3.5">
                {/* Mission header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: '#8b5cf6' }}
                    />
                    <Link
                      href={`/app/jobs/${mission.id}`}
                      className="text-[13px] font-medium truncate transition-opacity hover:opacity-70"
                      style={{ color: 'rgba(255,255,255,0.88)' }}
                    >
                      {mission.title || 'Active Mission'}
                    </Link>
                  </div>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-3"
                    style={{
                      background: mission.status === 'running' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.06)',
                      color: mission.status === 'running' ? '#a78bfa' : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {mission.status}
                  </span>
                </div>

                {/* Subtask timeline */}
                <div className="space-y-0">
                  {subtasks.map((step, i) => (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.25 }}
                      className="flex items-center gap-3 py-1.5 relative"
                    >
                      {/* Timeline line */}
                      {i < subtasks.length - 1 && (
                        <div
                          className="absolute left-[5px] top-[22px] w-px"
                          style={{
                            height: 'calc(100% - 4px)',
                            background: step.state === 'done'
                              ? 'rgba(52,199,89,0.2)'
                              : 'rgba(255,255,255,0.06)',
                          }}
                        />
                      )}

                      {/* Step icon */}
                      <div className="relative z-10 flex-shrink-0">
                        {step.state === 'done' && (
                          <div
                            className="w-3 h-3 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(52,199,89,0.18)', border: '1px solid rgba(52,199,89,0.45)' }}
                          >
                            <svg width="6" height="5" viewBox="0 0 6 5" fill="none">
                              <path d="M.75 2.5l1.5 1.5L5.25.75" stroke="rgba(52,199,89,0.9)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                        {step.state === 'running' && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                            className="w-3 h-3 rounded-full"
                            style={{ border: '1.5px solid rgba(139,92,246,0.18)', borderTopColor: '#8b5cf6' }}
                          />
                        )}
                        {step.state === 'pending' && (
                          <div className="w-3 h-3 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                        )}
                      </div>

                      <span
                        className="text-[12px]"
                        style={{
                          color: step.state === 'done'    ? 'rgba(255,255,255,0.28)'
                               : step.state === 'running' ? 'rgba(255,255,255,0.82)'
                               : 'rgba(255,255,255,0.2)',
                          textDecoration: step.state === 'done' ? 'line-through' : 'none',
                        }}
                      >
                        {step.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-5 py-3.5"
            >
              <p className="text-[12px] text-center" style={{ color: 'rgba(255,255,255,0.18)' }}>
                No active missions — board is standing by
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
