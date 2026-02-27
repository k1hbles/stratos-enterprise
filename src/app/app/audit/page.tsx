'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScrollText } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/shared/empty-state';

interface AuditEntry {
  id: string;
  user_id: string;
  session_id: string | null;
  job_id: string | null;
  director_slug: string | null;
  tool_name: string | null;
  tool_args: string | null;
  result_summary: string | null;
  success: number;
  duration_ms: number | null;
  created_at: string;
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchEntries = useCallback((before?: string) => {
    const url = before
      ? `/api/audit?limit=50&before=${encodeURIComponent(before)}`
      : '/api/audit?limit=50';

    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load audit log');
        return r.json();
      })
      .then((data: AuditEntry[]) => {
        setHasMore(data.length === 50);
        return data;
      });
  }, []);

  useEffect(() => {
    fetchEntries()
      .then(setEntries)
      .catch(() => setError('Failed to load audit log. Please try again.'))
      .finally(() => setLoading(false));
  }, [fetchEntries]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || entries.length === 0) return;
    setLoadingMore(true);
    try {
      const lastEntry = entries[entries.length - 1];
      const more = await fetchEntries(lastEntry.created_at);
      setEntries((prev) => [...prev, ...more]);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, entries, fetchEntries]);

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 rounded bg-white/[0.06]" />
          <div className="h-64 rounded-xl bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
        Audit Log
      </h1>

      {error ? (
        <div
          className="rounded-xl px-4 py-3 text-[13px] font-medium"
          style={{
            background: 'rgba(248, 113, 113, 0.08)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            color: 'rgba(248, 113, 113, 0.9)',
          }}
        >
          {error}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit entries"
          description="Agent tool calls and actions will be logged here."
        />
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wider uppercase text-white/40">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wider uppercase text-white/40">
                    Director
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wider uppercase text-white/40">
                    Tool
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wider uppercase text-white/40">
                    Summary
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium tracking-wider uppercase text-white/40">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-mono text-white/50">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[var(--text-primary)]">
                        {entry.director_slug ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-mono text-white/60">
                        {entry.tool_name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[300px]">
                      <span className="text-[13px] text-white/50 truncate block">
                        {entry.result_summary ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: entry.success
                              ? 'rgba(52, 211, 153, 0.8)'
                              : 'rgba(248, 113, 113, 0.8)',
                          }}
                        />
                        {entry.duration_ms != null && (
                          <span className="text-[11px] text-white/30">
                            {entry.duration_ms}ms
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="flex justify-center p-4 border-t border-white/[0.04]">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-150"
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
