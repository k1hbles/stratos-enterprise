'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { trpc } from '@/trpc/client';
import { cn } from '@/lib/utils/cn';

type FilterType = 'all' | 'completed' | 'running' | 'failed';

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'running', label: 'Running' },
  { value: 'failed', label: 'Failed' },
];

interface CouncilSession {
  id: string;
  goal: string;
  mode: string;
  stage: string;
  created_at: string;
  updated_at: string;
}

function StageBadge({ stage }: { stage: string }) {
  if (stage === 'completed') {
    return (
      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
        Complete
      </span>
    );
  }
  if (stage === 'failed') {
    return (
      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-red-400/10 text-red-400 border border-red-400/20">
        Failed
      </span>
    );
  }
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-400/10 text-blue-400 border border-blue-400/20 flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      Running
    </span>
  );
}

export function HistoryTab() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: sessions } = trpc.council.listSessions.useQuery({ limit: 50 });
  const { data: selectedSession } = trpc.council.getSession.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  const typedSessions = (sessions as unknown as CouncilSession[]) ?? [];

  const filtered = typedSessions.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return s.stage === 'completed';
    if (filter === 'failed') return s.stage === 'failed';
    // running = anything not completed or failed
    return s.stage !== 'completed' && s.stage !== 'failed';
  });

  const selectedDetail = selectedSession as Record<string, unknown> | undefined;
  const selectedDocs = (selectedDetail?.documents as Record<string, unknown>[]) ?? [];
  const selectedSummary = (selectedDetail?.chairman_summary as string) ?? '';

  return (
    <div className="flex gap-4 min-h-[400px]">
      {/* Left: session list */}
      <div className="flex-1 space-y-3">
        {/* Filter chips */}
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-150',
                filter === f.value
                  ? 'bg-white/[0.1] text-white/90 border border-white/[0.15]'
                  : 'bg-transparent text-white/40 border border-white/[0.06]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Session rows */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[13px] text-white/30">No sessions found</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => setSelectedId(session.id === selectedId ? null : session.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150',
                  selectedId === session.id
                    ? 'bg-white/[0.06] border border-white/[0.1]'
                    : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white/80 truncate">
                    {session.goal}
                  </p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </div>
                <StageBadge stage={session.stage} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: selected session detail */}
      {selectedId && selectedDetail && (
        <div
          className="w-[340px] flex-shrink-0 rounded-xl p-4 space-y-3"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-[13px] font-medium text-white/80">
            {selectedDetail.goal as string}
          </p>

          {selectedSummary && (
            <p className="text-[12px] text-white/45 leading-relaxed line-clamp-6">
              {selectedSummary}
            </p>
          )}

          {selectedDocs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium tracking-wider uppercase text-white/30">
                Documents
              </p>
              {selectedDocs.map((doc) => (
                <div
                  key={doc.id as string}
                  className="rounded-lg px-3 py-2 text-[12px] text-white/50"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  {(doc.title as string) ?? 'Document'}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => router.push(`/app/intelligence/${selectedId}`)}
            className="flex items-center gap-1 text-[12px] font-medium text-white/50 hover:text-white/80 transition-colors mt-2"
          >
            View Full Session
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
