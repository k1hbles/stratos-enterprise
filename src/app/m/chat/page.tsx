'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  PlusCircle,
  ChevronRight,
  Sparkles,
  Globe,
  BarChart2,
  Target,
  Users,
  X,
  Bot,
} from 'lucide-react';
import { MobileSidebar } from '@/components/mobile/sidebar';

const SpeakIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <path d="M13 8.5a5 5 0 0 1 0 7" />
    <path d="M16.5 5.5a10 10 0 0 1 0 13" />
  </svg>
);

type ChipId = 'agent' | 'board' | 'research' | 'analysis' | 'strategy';

const CHIPS: { id: ChipId; label: string; headerLabel: string; icon: typeof Sparkles; mode: string }[] = [
  { id: 'agent',    label: 'Agent',    headerLabel: 'Agent',    icon: Bot,           mode: 'openclaw' },
  { id: 'board',    label: 'Board',    headerLabel: 'Board',    icon: Users,        mode: 'council' },
  { id: 'research', label: 'Deep Research', headerLabel: 'Deep Research', icon: Globe,        mode: 'openclaw' },
  { id: 'analysis', label: 'Analysis', headerLabel: 'Analysis', icon: BarChart2,     mode: 'openclaw' },
  { id: 'strategy', label: 'Strategy', headerLabel: 'Strategy', icon: Target,       mode: 'openclaw' },
];

export default function MobileChatHome() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedChip, setSelectedChip] = useState<ChipId>('agent');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeChip = CHIPS.find((c) => c.id === selectedChip)!;

  const createAndNavigate = async (message?: string, mode?: string, fileIds?: string) => {
    if (sending) return;
    setSending(true);
    try {
      // Council mode → start a council session and redirect to intelligence page
      if (mode === 'council' && message) {
        const res = await fetch('/api/council/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal: message }),
        });
        const data = await res.json();
        if (data.sessionId) {
          const params = new URLSearchParams();
          params.set('sessionId', data.sessionId);
          params.set('goal', message);
          router.push(`/app/intelligence?${params.toString()}`);
        }
        return;
      }

      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Failed to create conversation');
      const { id } = await res.json();
      const params = new URLSearchParams();
      if (message) params.set('message', message);
      if (mode) params.set('mode', mode);
      if (fileIds) params.set('fileIds', fileIds);
      const qs = params.toString();
      router.push(`/m/chat/${id}${qs ? `?${qs}` : ''}`);
    } catch (e) {
      console.error(e);
      setSending(false);
    }
  };

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg && files.length === 0) return;

    // Upload files first if any
    const fileIds: string[] = [];
    if (files.length > 0) {
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          if (res.ok) {
            const record = await res.json();
            fileIds.push(record.id);
          }
        } catch (e) {
          console.error('Failed to upload file:', e);
        }
      }
    }

    setFiles([]);
    createAndNavigate(
      msg || `[Uploaded ${fileIds.length} file(s)]`,
      activeChip.mode,
      fileIds.length > 0 ? fileIds.join(',') : undefined
    );
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 z-10 bg-[#0f0f0f]">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">Stratos</span>
            <span className="text-sm text-gray-500 flex items-center gap-1 cursor-pointer hover:text-gray-300">
              {activeChip.headerLabel} <ChevronRight size={14} />
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-300">
          <button onClick={() => router.push('/m/chat')}>
            <PlusCircle size={22} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
        <div className="px-4 pt-4 flex flex-col gap-3">
          {/* Avatar */}
          <img
            src="/cloud-avatar.png"
            alt="Stratos"
            className="w-[65px] h-[65px] object-contain"
          />

          {/* Welcome Text */}
          <p className="text-[16px] leading-relaxed text-gray-200">
            Hi there, Stratos can generate documents, spreadsheets, and presentations. Try Agent to run complex tasks with AI.
          </p>

          {/* Suggestions */}
          <div className="flex flex-col items-start gap-2">
            <button
              onClick={() => createAndNavigate('One-click OpenClaw. 24/7 at your service.', 'openclaw')}
              disabled={sending}
              className="bg-[#10243e] text-[#5c9dff] px-3 py-2 rounded-md text-left text-[13px] font-medium border border-[#1a365d]"
            >
              One-click OpenClaw. 24/7 at your service.
            </button>
            <button
              onClick={() => createAndNavigate('Design a game webpage with upgrades and invincibility', 'openclaw')}
              disabled={sending}
              className="bg-[#18181a] text-gray-300 px-3 py-2 rounded-md text-left text-[13px] border border-[#27272a] max-w-full truncate"
            >
              Design a game webpage with upgrades and invin...
            </button>
            <button
              onClick={() => createAndNavigate('You can start a fire with ice', 'openclaw')}
              disabled={sending}
              className="bg-[#18181a] text-gray-300 px-3 py-2 rounded-md text-left text-[13px] border border-[#27272a]"
            >
              You can start a fire with ice
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Input Area */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-[#0f0f0f] pt-2 px-4 flex flex-col gap-2.5 z-20"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}
      >
        {/* Capability chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {CHIPS.map((chip) => {
            const Icon = chip.icon;
            const isSelected = selectedChip === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setSelectedChip(chip.id)}
                disabled={sending}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border whitespace-nowrap transition-all duration-150"
                style={{
                  background: isSelected ? 'rgba(59,130,246,0.08)' : '#18181a',
                  borderColor: isSelected ? 'rgba(59,130,246,0.25)' : '#27272a',
                  color: isSelected ? 'rgb(96,165,250)' : 'rgb(209,213,219)',
                }}
              >
                <Icon size={16} /> {chip.label}
              </button>
            );
          })}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.pdf,.txt,.md,.docx,.pptx,.json,.png,.jpg,.jpeg"
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            if (selected.length > 0) setFiles((prev) => [...prev, ...selected]);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Input card — Kimi style */}
        <div className="bg-[#18181a] border border-[#27272a] rounded-2xl overflow-hidden">
          {/* Mode header bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#27272a]">
            <div className="flex items-center gap-2.5 text-gray-400">
              <Bot size={18} strokeWidth={1.5} />
              <span className="text-[15px] font-medium text-gray-200">
                {activeChip.headerLabel}
              </span>
            </div>
            {selectedChip !== 'agent' && (
              <button
                onClick={() => setSelectedChip('agent')}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* File chips */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3.5 pt-2.5">
              {files.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="inline-flex items-center gap-1.5 bg-[#27272a] rounded-full px-2.5 py-1 text-[12px] text-gray-300"
                >
                  {f.name.length > 18 ? f.name.slice(0, 15) + '...' : f.name}
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-500 hover:text-white"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-center gap-3 px-2 py-1.5">
            <button className="p-1.5 text-gray-400 hover:text-white">
              <SpeakIcon />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Enter your request..."
              className="flex-1 bg-transparent text-white outline-none placeholder-gray-500 text-[15px]"
              disabled={sending}
            />
            <button className="p-1.5 text-gray-400 hover:text-white" onClick={() => fileInputRef.current?.click()}>
              <PlusCircle size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && <MobileSidebar onClose={() => setSidebarOpen(false)} />}
    </>
  );
}
