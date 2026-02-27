'use client';

import { MousePointerClick, Check, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/shared/empty-state';
import { trpc } from '@/trpc/client';
import { useState, useCallback } from 'react';

interface Confirmation {
  id: string;
  tool_name: string;
  description: string;
  director_slug: string;
  session_id: string;
  created_at: string;
}

interface Decision {
  id: string;
  title: string;
  reasoning: string;
  status: string;
  directors_involved: string[] | string;
  created_at: string;
}

export default function ActionsPage() {
  const utils = trpc.useUtils();

  const { data: confirmations, isLoading: confirmationsLoading } =
    trpc.confirmations.pending.useQuery();
  const { data: allDecisions, isLoading: decisionsLoading } =
    trpc.decisions.list.useQuery({ limit: 50 });

  const resolveMutation = trpc.confirmations.resolve.useMutation({
    onSuccess: () => utils.confirmations.pending.invalidate(),
  });

  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const pendingDecisions = (allDecisions ?? []).filter(
    (d: Record<string, unknown>) => d.status === 'pending'
  ) as unknown as Decision[];

  const pendingConfirmations = (confirmations ?? []) as unknown as Confirmation[];

  const handleResolveConfirmation = useCallback(
    (id: string, approved: boolean) => {
      resolveMutation.mutate({ id, approved });
    },
    [resolveMutation]
  );

  const handleResolveDecision = useCallback(
    async (id: string, status: 'approved' | 'rejected') => {
      setDecidingId(id);
      setDecisionError(null);
      try {
        const res = await fetch(`/api/decisions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error('Failed to resolve decision');
        utils.decisions.list.invalidate();
      } catch {
        setDecisionError('Failed to resolve decision. Please try again.');
      } finally {
        setDecidingId(null);
      }
    },
    [utils]
  );

  const loading = confirmationsLoading || decisionsLoading;

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 rounded bg-white/[0.06]" />
          <div className="h-24 rounded-xl bg-white/[0.04]" />
          <div className="h-24 rounded-xl bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  const hasNoItems = pendingConfirmations.length === 0 && pendingDecisions.length === 0;

  return (
    <div className="space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
        Actions
      </h1>

      {decisionError && (
        <div
          className="rounded-xl px-4 py-3 text-[13px] font-medium"
          style={{
            background: 'rgba(248, 113, 113, 0.08)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            color: 'rgba(248, 113, 113, 0.9)',
          }}
        >
          {decisionError}
        </div>
      )}

      {hasNoItems ? (
        <EmptyState
          icon={MousePointerClick}
          title="No pending actions"
          description="When your AI agents need approval or decisions, they'll appear here."
        />
      ) : (
        <>
          {/* Pending Confirmations */}
          <div className="space-y-3">
            <h2 className="text-[11px] font-medium tracking-widest uppercase text-white/40">
              Pending Confirmations
            </h2>
            {pendingConfirmations.length === 0 ? (
              <GlassCard className="p-6">
                <p className="text-[14px] text-white/40 text-center">No pending confirmations</p>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {pendingConfirmations.map((c) => (
                  <GlassCard key={c.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-mono font-medium bg-white/[0.06] text-white/60">
                            {c.tool_name}
                          </span>
                          {c.director_slug && (
                            <span className="text-[11px] text-white/30">{c.director_slug}</span>
                          )}
                        </div>
                        <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
                          {c.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleResolveConfirmation(c.id, true)}
                          disabled={resolveMutation.isPending}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150"
                          style={{
                            background: 'rgba(52, 211, 153, 0.15)',
                            color: 'rgba(52, 211, 153, 0.9)',
                            border: '1px solid rgba(52, 211, 153, 0.2)',
                          }}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleResolveConfirmation(c.id, false)}
                          disabled={resolveMutation.isPending}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150"
                          style={{
                            background: 'rgba(248, 113, 113, 0.15)',
                            color: 'rgba(248, 113, 113, 0.9)',
                            border: '1px solid rgba(248, 113, 113, 0.2)',
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>

          {/* Pending Decisions */}
          <div className="space-y-3">
            <h2 className="text-[11px] font-medium tracking-widest uppercase text-white/40">
              Pending Decisions
            </h2>
            {pendingDecisions.length === 0 ? (
              <GlassCard className="p-6">
                <p className="text-[14px] text-white/40 text-center">No pending decisions</p>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {pendingDecisions.map((d) => {
                  const directors = Array.isArray(d.directors_involved)
                    ? d.directors_involved
                    : [];
                  return (
                    <GlassCard key={d.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
                            {d.title}
                          </p>
                          <p className="text-[13px] text-white/50 leading-relaxed line-clamp-2">
                            {d.reasoning}
                          </p>
                          {directors.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2">
                              {directors.map((dir: string) => (
                                <span
                                  key={dir}
                                  className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-white/[0.04] text-white/40"
                                >
                                  {dir}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleResolveDecision(d.id, 'approved')}
                            disabled={decidingId === d.id}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150"
                            style={{
                              background: 'rgba(52, 211, 153, 0.15)',
                              color: 'rgba(52, 211, 153, 0.9)',
                              border: '1px solid rgba(52, 211, 153, 0.2)',
                            }}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleResolveDecision(d.id, 'rejected')}
                            disabled={decidingId === d.id}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150"
                            style={{
                              background: 'rgba(248, 113, 113, 0.15)',
                              color: 'rgba(248, 113, 113, 0.9)',
                              border: '1px solid rgba(248, 113, 113, 0.2)',
                            }}
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
