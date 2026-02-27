'use client';

import { useMemo } from 'react';
import type { Exchange } from '@/hooks/useCouncilSSE';

interface PeerReviewBlockProps {
  exchanges: Exchange[];
  rankings: Record<string, unknown>[];
}

function buildAnonymousMap(exchanges: Exchange[], rankings: Record<string, unknown>[]): Map<string, string> {
  const slugs = new Set<string>();
  for (const ex of exchanges) {
    if (ex.from_director) slugs.add(ex.from_director);
    if (ex.to_director) slugs.add(ex.to_director);
  }
  for (const r of rankings) {
    const slug = (r.directorSlug as string) ?? (r.director as string);
    if (slug) slugs.add(slug);
  }
  const sorted = Array.from(slugs).sort();
  const map = new Map<string, string>();
  sorted.forEach((slug, i) => {
    const letter = String.fromCharCode(65 + i); // A, B, C...
    map.set(slug, `Director ${letter}`);
  });
  return map;
}

export function PeerReviewBlock({ exchanges, rankings }: PeerReviewBlockProps) {
  const anonymousMap = useMemo(() => buildAnonymousMap(exchanges, rankings), [exchanges, rankings]);

  if (exchanges.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        border: '1px solid rgba(251,191,36,0.2)',
        background: 'rgba(251,191,36,0.03)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: 'rgba(251,191,36,0.15)', color: 'rgb(251,191,36)' }}
        >
          PR
        </div>
        <span className="text-[13px] font-medium text-amber-400">Peer Review</span>
        {rankings.length > 0 && (
          <span className="text-[11px] text-amber-400/60 ml-auto">Consensus reached</span>
        )}
      </div>

      {/* Exchange feed */}
      <div className="space-y-2 pl-8">
        {exchanges.map((ex) => (
          <div
            key={ex.id}
            className="rounded-lg p-2.5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[11px] font-medium text-amber-300/70">
                {anonymousMap.get(ex.from_director) ?? ex.from_director}
              </span>
              {ex.to_director && (
                <>
                  <span className="text-[10px] text-white/20">{'\u2192'}</span>
                  <span className="text-[11px] font-medium text-amber-300/70">
                    {anonymousMap.get(ex.to_director) ?? ex.to_director}
                  </span>
                </>
              )}
            </div>
            <p className="text-[12px] text-white/50 leading-relaxed line-clamp-3">
              {ex.content}
            </p>
          </div>
        ))}
      </div>

      {/* Consensus ranking */}
      {rankings.length > 0 && (
        <div className="mt-3 pt-3 pl-8" style={{ borderTop: '1px solid rgba(251,191,36,0.1)' }}>
          <p className="text-[11px] font-medium text-amber-400/50 uppercase tracking-wider mb-2">
            Ranking
          </p>
          <div className="space-y-1">
            {rankings.map((r, i) => {
              const slug = (r.directorSlug as string) ?? (r.director as string) ?? '';
              const rank = (r.avgRank as number) ?? (r.score as number);
              return (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <span className="text-amber-400/70 font-medium w-4">{i + 1}.</span>
                  <span className="text-white/50">
                    {anonymousMap.get(slug) ?? (slug || `Entry ${i + 1}`)}
                  </span>
                  {rank != null && (
                    <span className="text-white/30 ml-auto">{typeof rank === 'number' ? rank.toFixed(1) : String(rank)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
