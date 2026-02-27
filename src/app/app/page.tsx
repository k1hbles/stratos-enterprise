'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ParticlesBackground } from '@/components/particles-background';
import { TypewriterGreeting, getGreeting } from '@/components/typewriter-greeting';
import { GlassInput } from '@/components/ui/glass-input';
import { SkillButtons } from '@/components/home/skill-buttons';
import { useAuth } from '@/hooks/useAuth';
import type { QuickAction } from '@/components/home/skill-buttons';
import type { ChatMode } from '@/components/chat/message-input';

export default function HomePage() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [animationStage, setAnimationStage] = useState(0);
  const [activeMode, setActiveMode] = useState<QuickAction | null>(null);
  const sendingRef = useRef(false);

  const { user } = useAuth();
  const userName = user?.email?.split('@')[0];
  const greeting = getGreeting(userName);

  const handleTypewriterComplete = useCallback(() => {
    setTimeout(() => setAnimationStage(1), 300);
    setTimeout(() => setAnimationStage(2), 700);
    setTimeout(() => setAnimationStage(3), 1100);
  }, []);

  const handleSend = async (files: File[] = [], mode: ChatMode = 'openclaw') => {
    const message = inputValue.trim();
    if (!message && files.length === 0) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    setIsUploading(true);

    const effectiveMode = activeMode ? activeMode.mode as ChatMode : mode;

    try {
      // Council/fullstack modes → start council session and redirect to intelligence page
      if (effectiveMode === 'council' || effectiveMode === 'fullstack') {
        if (!message) return;
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

      const params = new URLSearchParams();
      if (message) params.set('message', message);
      if (fileIds.length > 0) params.set('fileIds', fileIds.join(','));
      params.set('mode', effectiveMode);
      router.push(`/app/chat/new?${params.toString()}`);
    } finally {
      setIsUploading(false);
      sendingRef.current = false;
    }
  };

  return (
    <div className="flex-1 flex flex-col relative h-full overflow-hidden">
      <ParticlesBackground />

      <main className="flex-1 flex flex-col items-center relative z-10 px-6 pt-[28vh] overflow-y-auto">
        <div className="w-full max-w-[855px] flex-shrink-0 relative z-20">
          {/* Greeting */}
          <div className="text-center mb-10">
            <TypewriterGreeting
              greeting={greeting}
              onComplete={handleTypewriterComplete}
            />
          </div>

          {/* Input */}
          <div className="mb-2 w-full">
            <GlassInput
              value={inputValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
              onSend={handleSend}
              animationStage={animationStage}
              placeholder="What do you want to know?"
              isLoading={isUploading}
              activeMode={activeMode}
              onClearMode={() => setActiveMode(null)}
            />
          </div>

          {/* Skill Buttons — deferred until animation stage */}
          {animationStage >= 2 && (
            <SkillButtons
              animateIn
              activeMode={activeMode}
              onSelect={setActiveMode}
            />
          )}
        </div>

      </main>
    </div>
  );
}
