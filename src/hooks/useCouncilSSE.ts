'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface DirectorState {
  slug: string;
  name: string;
  role: string;
  goal: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  steps: { type: string; name: string; result?: string }[];
  output: string;
}

export interface Exchange {
  id: string;
  from_director: string;
  to_director: string;
  content: string;
  created_at: string;
}

export interface CouncilSSEState {
  stage: string;
  directors: DirectorState[];
  exchanges: Exchange[];
  rankings: Record<string, unknown>[];
  synthesis: string;
  connected: boolean;
  error: string | null;
}

export function formatDirectorName(slug: string): string {
  if (!slug) return 'Unknown';
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useCouncilSSE(sessionId: string | null): CouncilSSEState {
  const [stage, setStage] = useState('pending');
  const [directors, setDirectors] = useState<DirectorState[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [rankings, setRankings] = useState<Record<string, unknown>[]>([]);
  const [synthesis, setSynthesis] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleSSEEvent = useCallback((evt: Record<string, unknown>) => {
    const type = evt.type as string;
    const data = (evt.data ?? {}) as Record<string, unknown>;
    const slug = (data.directorSlug as string) ?? (data.director_slug as string) ?? '';

    switch (type) {
      case 'stage_change':
        setStage(data.stage as string);
        break;

      case 'plan_ready': {
        const tasks = (data.tasks as Record<string, unknown>[]) ?? [];
        setDirectors(
          tasks.map((t) => {
            const s = (t.directorSlug as string) ?? (t.director_slug as string) ?? '';
            return {
              slug: s,
              name: formatDirectorName(s),
              role: s,
              goal: (t.goal as string) ?? '',
              status: 'idle' as const,
              steps: [],
              output: '',
            };
          })
        );
        break;
      }

      case 'task_started':
        setDirectors((prev) =>
          prev.map((d) =>
            d.slug === slug ? { ...d, status: 'running' as const } : d
          )
        );
        break;

      case 'tool_call':
        setDirectors((prev) =>
          prev.map((d) =>
            d.slug === slug
              ? { ...d, steps: [...d.steps, { type: 'call', name: data.toolName as string }] }
              : d
          )
        );
        break;

      case 'tool_result':
        setDirectors((prev) =>
          prev.map((d) => {
            if (d.slug !== slug) return d;
            const steps = [...d.steps];
            const lastCall = [...steps].reverse().find((s) => s.type === 'call' && !s.result);
            if (lastCall) lastCall.result = (data.summary as string) ?? 'Done';
            return { ...d, steps };
          })
        );
        break;

      case 'director_text':
        setDirectors((prev) =>
          prev.map((d) =>
            d.slug === slug
              ? { ...d, output: d.output + ((data.text as string) ?? '') }
              : d
          )
        );
        break;

      case 'task_completed':
        setDirectors((prev) =>
          prev.map((d) =>
            d.slug === slug ? { ...d, status: 'completed' as const } : d
          )
        );
        break;

      case 'exchange': {
        const rankingsArr = (data.rankings as string[]) ?? [];
        const rankingStr = rankingsArr.length > 0
          ? `Ranked: ${rankingsArr.join(' > ')}`
          : '';
        const commentary = (data.commentary as string) ?? '';
        const exchangeContent = commentary
          ? `${rankingStr}\n\n${commentary.slice(0, 500)}`
          : rankingStr;
        setExchanges((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            from_director: (data.reviewerSlug as string) ?? '',
            to_director: '',
            content: exchangeContent,
            created_at: new Date().toISOString(),
          },
        ]);
        break;
      }

      case 'rankings_ready':
        setRankings((data.rankings as Record<string, unknown>[]) ?? []);
        break;

      case 'session_complete':
        setStage('completed');
        if (data.summary) setSynthesis(data.summary as string);
        break;

      case 'session_failed':
        setStage('failed');
        setError((data.error as string) ?? 'Session failed');
        break;
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    // Reset state for new session
    setStage('pending');
    setDirectors([]);
    setExchanges([]);
    setRankings([]);
    setSynthesis('');
    setError(null);

    let retryCount = 0;
    const MAX_RETRIES = 3;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let pendingTimeout: ReturnType<typeof setTimeout> | null = null;
    let gotRealEvent = false;
    let closed = false;

    function connect() {
      if (closed) return;

      const es = new EventSource(`/api/council/stream?sessionId=${sessionId}`);
      eventSourceRef.current = es;
      setConnected(true);

      // 30s pending timeout — if no meaningful event, show warning
      if (!gotRealEvent) {
        pendingTimeout = setTimeout(() => {
          if (!gotRealEvent && !closed) {
            setError('Session appears stuck — no events received after 30s');
            setStage('failed');
            es.close();
            setConnected(false);
          }
        }, 30000);
      }

      es.onmessage = (event) => {
        if (event.data === '[DONE]') {
          es.close();
          setConnected(false);
          return;
        }

        try {
          const evt = JSON.parse(event.data);
          if (!gotRealEvent) {
            gotRealEvent = true;
            retryCount = 0;
            if (pendingTimeout) clearTimeout(pendingTimeout);
          }
          handleSSEEvent(evt);
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        setConnected(false);

        if (closed) return;

        if (retryCount < MAX_RETRIES) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          retryCount++;
          retryTimeout = setTimeout(connect, delay);
        } else {
          setError('Connection lost — could not reconnect');
        }
      };
    }

    connect();

    return () => {
      closed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (pendingTimeout) clearTimeout(pendingTimeout);
      if (eventSourceRef.current) eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [sessionId, handleSSEEvent]);

  return { stage, directors, exchanges, rankings, synthesis, connected, error };
}
