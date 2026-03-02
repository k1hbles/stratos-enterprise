'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle,
  SquarePen,
  ChevronRight,
  Globe,
  BarChart2,
  Target,
  Users,
  X,
  Bot,
  ArrowUp,
  Check,
  ImageIcon,
  Paperclip,
  Camera,
  Atom,
  FileIcon,
} from 'lucide-react';
import { MobileSidebar, MobileSettingsOverlay, MobileGalleryOverlay } from '@/components/mobile/sidebar';
import { useTheme } from '@/components/theme-provider';

const SpeakIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <path d="M13 8.5a5 5 0 0 1 0 7" />
    <path d="M16.5 5.5a10 10 0 0 1 0 13" />
  </svg>
);

type ModeId = 'agent' | 'board';

const MODES: { id: ModeId; label: string; desc: string; icon: typeof Bot }[] = [
  { id: 'agent', label: 'Agent', desc: 'AI assistant with tools & web research', icon: Bot },
  { id: 'board', label: 'Board', desc: 'Multi-agent council + deep analysis', icon: Users },
];

type ChipId = 'research' | 'analysis' | 'strategy';

const CHIPS: { id: ChipId; label: string; icon: typeof Globe }[] = [
  { id: 'research', label: 'Deep Research', icon: Globe },
  { id: 'analysis', label: 'Analysis', icon: BarChart2 },
  { id: 'strategy', label: 'Strategy', icon: Target },
];

export default function MobileChatHome() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ModeId>('agent');
  const [modeSelectOpen, setModeSelectOpen] = useState(false);
  const [selectedChip, setSelectedChip] = useState<ChipId | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

  const activeMode = MODES.find((m) => m.id === selectedMode)!;
  const activeChip = selectedChip ? CHIPS.find((c) => c.id === selectedChip) : null;

  const effectiveMode = selectedMode === 'board' ? 'council' : 'openclaw';
  const inputHeaderLabel = selectedMode === 'board' ? 'Board' : (activeChip?.label || 'Agent');
  const InputHeaderIcon = selectedMode === 'board' ? Users : Bot;

  const logoSrc = resolvedTheme === 'dark' ? '/hyprnova-mark.png' : '/hyprnova-mark-black.png';

  const [greeting, setGreeting] = useState('today');
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('this morning');
    else if (h < 17) setGreeting('this afternoon');
    else setGreeting('this evening');
  }, []);

  const handleFileClick = (accept?: string) => {
    if (fileInputRef.current) {
      if (accept) {
        fileInputRef.current.accept = accept;
      } else {
        fileInputRef.current.removeAttribute('accept');
      }
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      setIsPlusMenuOpen(false);
      setFiles((prev) => [...prev, ...Array.from(selected)]);
    }
    if (e.target) e.target.value = '';
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

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
      effectiveMode,
      fileIds.length > 0 ? fileIds.join(',') : undefined
    );
  };

  return (
    <>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative flex items-center justify-between px-4 py-3 z-10 bg-[var(--bg-page)]"
      >
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="3" y1="15" x2="14" y2="15" />
            </svg>
          </button>
          <button
            className="flex items-center gap-1 font-semibold text-lg"
            onClick={(e) => {
              e.stopPropagation();
              setModeSelectOpen(!modeSelectOpen);
            }}
          >
            ELK{' '}
            <span className="text-[var(--text-subtle)] font-normal">
              {activeMode.label}{selectedChip ? ' Thinking' : ''}
            </span>
            <ChevronRight className="w-4 h-4 text-[var(--text-subtle)]" />
          </button>
        </div>
        <div className="flex items-center gap-4 text-[var(--text-secondary)]">
          <button onClick={() => router.push('/m/chat')}>
            <SquarePen size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Mode selector dropdown */}
        <AnimatePresence>
          {modeSelectOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-30"
                onClick={() => setModeSelectOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-14 left-1/2 -translate-x-1/2 bg-[var(--bg-elevated)] rounded-2xl w-[280px] z-50 overflow-hidden shadow-2xl border border-[var(--border-strong)]"
              >
                <div className="p-3 text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider border-b border-[var(--border-strong)]">
                  ELK v1
                </div>
                <div className="flex flex-col">
                  {MODES.map((m, i) => (
                    <div key={m.id}>
                      <button
                        onClick={() => {
                          setSelectedMode(m.id);
                          setSelectedChip(null);
                          setModeSelectOpen(false);
                        }}
                        className="flex items-center justify-between w-full p-4 hover:bg-[var(--sidebar-item-hover)] active:bg-[var(--sidebar-item-hover)] text-left transition-colors"
                      >
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">{m.label}</div>
                          <div className="text-sm text-[var(--text-subtle)]">{m.desc}</div>
                        </div>
                        {selectedMode === m.id && (
                          <Check className="w-5 h-5 text-[var(--text-primary)] shrink-0" />
                        )}
                      </button>
                      {i < MODES.length - 1 && (
                        <div className="h-[1px] bg-[var(--border-strong)] ml-4" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Main Content — centered greeting */}
      {!sending && (
        <div className="flex-1 flex flex-col items-center justify-center pb-28 px-6">
          <img
            src={logoSrc}
            alt="ELK"
            className="w-[52px] h-[52px] object-contain mb-5"
          />
          <p className="text-[28px] font-normal text-[var(--text-primary)] text-center leading-snug">
            How can I help you<br />{greeting}?
          </p>
        </div>
      )}

      {/* Spacer when greeting is gone */}
      {sending && <div className="flex-1" />}

      {/* Plus menu — bottom sheet */}
      {isPlusMenuOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-[var(--overlay)]" onClick={() => setIsPlusMenuOpen(false)} />
          <div className="relative z-10 bg-[var(--bg-tertiary)] rounded-t-3xl animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-9 h-1 rounded-full bg-[var(--text-placeholder)]" />
            </div>

            {/* File buttons row */}
            <div className="flex gap-3 px-6 pb-5">
              <button
                className="flex-1 bg-[var(--bg-elevated)] rounded-2xl py-4 flex flex-col items-center gap-2 active:bg-[var(--sidebar-item-active)] transition-colors"
                onClick={handleCameraClick}
              >
                <Camera className="w-6 h-6 text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Camera</span>
              </button>
              <button
                className="flex-1 bg-[var(--bg-elevated)] rounded-2xl py-4 flex flex-col items-center gap-2 active:bg-[var(--sidebar-item-active)] transition-colors"
                onClick={() => handleFileClick('image/*,video/*')}
              >
                <ImageIcon className="w-6 h-6 text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Photos</span>
              </button>
              <button
                className="flex-1 bg-[var(--bg-elevated)] rounded-2xl py-4 flex flex-col items-center gap-2 active:bg-[var(--sidebar-item-active)] transition-colors"
                onClick={() => handleFileClick()}
              >
                <Paperclip className="w-6 h-6 text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Files</span>
              </button>
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-[var(--bg-elevated)]" />

            {/* Capability list */}
            <div className="px-6 py-3 flex flex-col" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
              {[
                { icon: Globe, label: 'Deep Research', desc: 'Get a detailed report', chip: 'research' as ChipId },
                { icon: BarChart2, label: 'Analysis', desc: 'Analyze data and trends', chip: 'analysis' as ChipId },
                { icon: Target, label: 'Strategy', desc: 'Plan and strategize', chip: 'strategy' as ChipId },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      setSelectedMode('agent');
                      setSelectedChip(item.chip);
                      setIsPlusMenuOpen(false);
                    }}
                    className="flex items-center gap-4 py-3.5 active:bg-[var(--sidebar-item-hover)] rounded-xl px-1 transition-colors"
                  >
                    <Icon size={22} className="text-[var(--text-subtle)] shrink-0" />
                    <div className="flex flex-col items-start">
                      <span className="text-[15px] font-medium text-[var(--text-primary)]">{item.label}</span>
                      <span className="text-[13px] text-[var(--text-placeholder)]">{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Input Area */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-[var(--bg-page)] pt-2 px-4 flex flex-col gap-2.5 z-20"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        {/* Capability chips — only in Agent mode */}
        {selectedMode === 'agent' && (
          <motion.div
            className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {CHIPS.map((chip) => {
              const Icon = chip.icon;
              const isSelected = selectedChip === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setSelectedChip(isSelected ? null : chip.id)}
                  disabled={sending}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm whitespace-nowrap transition-all duration-150"
                  style={{
                    background: isSelected ? 'var(--thinking-pill-bg)' : 'transparent',
                    border: '1px solid var(--chip-border)',
                    color: isSelected ? 'var(--thinking-pill-text)' : 'var(--text-secondary)',
                  }}
                >
                  <Icon size={16} /> {chip.label}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* Hidden file inputs */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          multiple
        />
        <input
          type="file"
          ref={cameraInputRef}
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
        />

        {/* Input card — always the same shape */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--chatbox-bg)' }}>

          {/* Board pill — inside card at top */}
          {selectedMode === 'board' && (
            <>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-[var(--text-subtle)]">
                  <Users size={16} strokeWidth={1.5} />
                  <span className="text-[14px] font-medium text-[var(--text-secondary)]">Board</span>
                </div>
                <button
                  onClick={() => setSelectedMode('agent')}
                  className="text-[var(--text-placeholder)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
              <div className="border-t border-[var(--border-strong)]" />
            </>
          )}

          {/* Thinking chip — inside card at top */}
          {activeChip && selectedMode !== 'board' && (
            <>
              <div className="flex items-center gap-2 px-3.5 py-2.5">
                <Atom size={16} className="shrink-0" style={{ color: 'var(--thinking-pill-text)' }} />
                <span className="text-[14px] font-medium flex-1" style={{ color: 'var(--thinking-pill-text)' }}>{activeChip.label}</span>
                <button
                  onClick={() => setSelectedChip(null)}
                  className="text-[var(--text-placeholder)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
              <div className="border-t border-[var(--border-strong)]" />
            </>
          )}

          {/* File chips */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
              {files.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="inline-flex items-center gap-1.5 bg-[var(--bg-elevated)] rounded-full px-2.5 py-1 text-[12px] text-[var(--text-primary)]"
                >
                  {f.name.length > 18 ? f.name.slice(0, 15) + '...' : f.name}
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-[var(--text-placeholder)] hover:text-[var(--text-primary)]"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-center gap-3 px-2 py-1.5">
            <button className="p-1.5 text-[var(--text-subtle)] hover:text-[var(--text-primary)]" onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}>
              <PlusCircle size={22} />
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
              placeholder="Ask ELK anything"
              className="flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder-[var(--text-placeholder)] text-[15px]"
              disabled={sending}
            />
            {input.trim() ? (
              <button
                className="p-1.5 bg-[var(--send-btn-bg)] rounded-full text-[var(--send-btn-icon)] transition-colors"
                onClick={handleSend}
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            ) : (
              <button className="p-1.5 text-[var(--text-subtle)] hover:text-[var(--text-primary)]">
                <SpeakIcon />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Settings Overlay */}
      {settingsOpen && <MobileSettingsOverlay onClose={() => setSettingsOpen(false)} />}

      {/* Gallery Overlay */}
      {galleryOpen && (
        <MobileGalleryOverlay
          onClose={() => setGalleryOpen(false)}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      )}

      {/* Sidebar — rendered last so it sits on top of gallery */}
      {sidebarOpen && (
        <MobileSidebar
          onClose={() => { setSidebarOpen(false); setGalleryOpen(false); }}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenGallery={() => setGalleryOpen(true)}
        />
      )}
    </>
  );
}
