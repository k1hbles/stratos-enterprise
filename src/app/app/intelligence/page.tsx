'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Layers, Users, BarChart2, Globe, FileText, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useCouncilSSE } from '@/hooks/useCouncilSSE';
import type { CouncilSSEState } from '@/hooks/useCouncilSSE';
import { useToast } from '@/components/ui/toast';
import { OpenClawBlock } from '@/components/intelligence/open-claw-block';
import { CouncilBlock } from '@/components/intelligence/council-block';
import { PeerReviewBlock } from '@/components/intelligence/peer-review-block';
import { SynthesisBlock } from '@/components/intelligence/synthesis-block';
import { IntelligenceInput } from '@/components/intelligence/intelligence-input';
import { HistoryTab } from '@/components/intelligence/history-tab';
import { SessionSidebar } from '@/components/intelligence/session-sidebar';

type Tab = 'intelligence' | 'history';

interface SessionEntry {
  sessionId: string;
  goal: string;
}

const QUICK_CHIPS = [
  { label: 'Competitive Analysis', icon: Users },
  { label: 'Market Research', icon: Globe },
  { label: 'Data Analysis', icon: BarChart2 },
  { label: 'Strategic Report', icon: FileText },
];

export default function IntelligencePage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('intelligence');
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const prevActiveRef = useRef<string | null>(null);

  // Lift SSE to page level for the active session
  const activeSSE = useCouncilSSE(activeSessionId);
  const activeGoal = sessions.find((s) => s.sessionId === activeSessionId)?.goal ?? '';

  // Auto-open sidebar when a session starts
  useEffect(() => {
    if (activeSessionId && !prevActiveRef.current) {
      setSidebarOpen(true);
    }
    prevActiveRef.current = activeSessionId;
  }, [activeSessionId]);

  // URL param initialization (from home page redirect)
  useEffect(() => {
    if (initializedRef.current) return;
    const urlSessionId = searchParams.get('sessionId');
    const urlGoal = searchParams.get('goal');
    if (urlSessionId && urlGoal) {
      initializedRef.current = true;
      setSessions([{ sessionId: urlSessionId, goal: urlGoal }]);
      setActiveSessionId(urlSessionId);
    }
  }, [searchParams]);

  // Auto-scroll when sessions change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions]);

  const { addToast } = useToast();

  const handleSend = useCallback(async (message: string) => {
    if (message.trim().length < 10) {
      addToast({
        title: 'Input too short',
        description: 'Please provide a more specific question or goal for the council to analyze.',
        variant: 'info',
        duration: 4000,
      });
      return;
    }

    try {
      const res = await fetch('/api/council/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: message }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessions((prev) => [...prev, { sessionId: data.sessionId, goal: message }]);
        setActiveSessionId(data.sessionId);
      }
    } catch (err) {
      console.error('Failed to start council session:', err);
    }
  }, [addToast]);

  const handleQuickChip = useCallback((label: string) => {
    handleSend(label);
  }, [handleSend]);

  // Check if any session is currently running (not completed/failed)
  const isRunning =
    activeSessionId !== null &&
    activeSSE.stage !== 'completed' &&
    activeSSE.stage !== 'failed';

  return (
    <div className="flex flex-col h-full">
      {/* Tab strip */}
      <div className="flex items-center gap-0 px-5 h-[48px] flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setTab('intelligence')}
          className={cn(
            'px-4 py-2 text-[13px] font-medium transition-colors duration-150 relative',
            tab === 'intelligence' ? 'text-white/90' : 'text-white/40 hover:text-white/60'
          )}
        >
          Council
          {tab === 'intelligence' && (
            <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-white/70" />
          )}
        </button>
        <button
          onClick={() => setTab('history')}
          className={cn(
            'px-4 py-2 text-[13px] font-medium transition-colors duration-150 relative',
            tab === 'history' ? 'text-white/90' : 'text-white/40 hover:text-white/60'
          )}
        >
          History
          {tab === 'history' && (
            <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-white/70" />
          )}
        </button>

        {/* Sidebar toggle — right-aligned, only on intelligence tab */}
        {tab === 'intelligence' && activeSessionId && (
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className={cn(
              'ml-auto p-1.5 rounded-md transition-colors duration-150',
              sidebarOpen
                ? 'text-white/70 bg-white/[0.06]'
                : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'
            )}
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <PanelRight size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {tab === 'history' ? (
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <HistoryTab />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Main content column */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Scrollable message area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 space-y-6">
                {sessions.length === 0 ? (
                  /* Empty state with 3D scene */
                  <div className="flex flex-col items-center justify-center pt-[5vh]">
                    {/* Logo mark */}
                    <Image
                      src="/logo-mark.png"
                      alt="Logo"
                      width={48}
                      height={48}
                      className="object-contain mb-5"
                    />
                    {/* Featured pill */}
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3"
                      style={{
                        background: 'rgba(96,165,250,0.08)',
                        border: '1px solid rgba(96,165,250,0.15)',
                      }}
                    >
                      <Layers className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-blue-400">Full Intelligence Pipeline</span>
                    </div>

                    <p className="text-[14px] text-white/40 mb-8 text-center max-w-md">
                      OpenClaw + LLM Council + Peer Review + Synthesis. Ask anything to activate the full intelligence pipeline.
                    </p>

                    <div className="flex flex-wrap justify-center gap-2">
                      {QUICK_CHIPS.map((chip) => {
                        const Icon = chip.icon;
                        return (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => handleQuickChip(chip.label)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-all duration-150"
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              color: 'rgba(255,255,255,0.6)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                            }}
                          >
                            <Icon className="w-4 h-4" strokeWidth={1.5} />
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Active sessions */
                  sessions.map((s) => (
                    <CouncilExecutionView
                      key={s.sessionId}
                      sessionId={s.sessionId}
                      goal={s.goal}
                      sse={s.sessionId === activeSessionId ? activeSSE : undefined}
                      onComplete={() => {
                        // Input re-enable is now handled by isRunning stage check
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Input bar — pinned bottom */}
            <div className="flex-shrink-0 px-4 pb-4 pt-2 md:px-8">
              <div className="max-w-3xl mx-auto">
                <IntelligenceInput
                  onSend={handleSend}
                  disabled={isRunning}
                />
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          {sidebarOpen && activeSessionId && (
            <SessionSidebar sse={activeSSE} goal={activeGoal} />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Council Execution View ──────────────────────────── */

function CouncilExecutionView({
  sessionId,
  goal,
  sse: externalSSE,
  onComplete,
}: {
  sessionId: string;
  goal: string;
  sse?: CouncilSSEState;
  onComplete: () => void;
}) {
  const internalSSE = useCouncilSSE(externalSSE ? null : sessionId);
  const sse = externalSSE ?? internalSSE;
  const completedRef = useRef(false);

  useEffect(() => {
    if ((sse.stage === 'completed' || sse.stage === 'failed') && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [sse.stage, onComplete]);

  return (
    <div className="space-y-4">
      {/* User bubble */}
      <div className="flex justify-end">
        <div
          className="rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-[14px] text-white/90 leading-relaxed">{goal}</p>
        </div>
      </div>

      {/* Layer 1: OpenClaw */}
      <OpenClawBlock
        steps={[
          'Loading user context...',
          'Reconstituting memory graph...',
          'Indexing prior sessions...',
          'Preparing tool access...',
          'Building execution plan...',
        ]}
        isReady={sse.stage === 'analyzing' || sse.stage === 'analysis' || sse.stage === 'peer_review' || sse.stage === 'synthesis' || sse.stage === 'completed'}
      />

      {/* Layer 2: Council (show after plan_ready / when directors exist) */}
      {sse.directors.length > 0 && (
        <CouncilBlock stage={sse.stage} directors={sse.directors} />
      )}

      {/* Layer 3: Peer Review (show when exchanges exist) */}
      {sse.exchanges.length > 0 && (
        <PeerReviewBlock exchanges={sse.exchanges} rankings={sse.rankings} />
      )}

      {/* Layer 4: Synthesis */}
      {(sse.synthesis || sse.stage === 'synthesis') && (
        <SynthesisBlock synthesis={sse.synthesis} stage={sse.stage} />
      )}

      {/* Error display */}
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

      {/* Connection indicator */}
      {sse.connected && (
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-white/30">Live</span>
        </div>
      )}
    </div>
  );
}
